<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Patient;
use App\Models\PatientDocument;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class PatientDocumentController extends Controller
{
    public function index(Request $request, Patient $patient)
    {
        $this->authorizePatient($request, $patient);
        $this->auditDocumentAccess($request, $patient, 'patient_documents_viewed');

        return $patient->documents()
            ->with('uploader:id,name')
            ->latest()
            ->get();
    }

    public function myDocuments(Request $request)
    {
        return $this->index($request, $this->myPatient($request));
    }

    public function store(Request $request, Patient $patient)
    {
        $this->authorizePatient($request, $patient);

        return $this->saveDocument($request, $patient);
    }

    public function storeForMe(Request $request)
    {
        return $this->saveDocument($request, $this->myPatient($request));
    }

    public function download(Request $request, Patient $patient, PatientDocument $document)
    {
        $this->authorizePatient($request, $patient);
        abort_unless($document->patient_id === $patient->id, 404);
        abort_unless(Storage::disk('local')->exists($document->file_path), 404, 'Document file is missing.');
        $this->auditDocumentAccess($request, $patient, 'patient_document_downloaded', $document);

        return Storage::disk('local')->download($document->file_path, $document->original_name);
    }

    public function downloadForMe(Request $request, PatientDocument $document)
    {
        $patient = $this->myPatient($request);
        abort_unless($document->patient_id === $patient->id, 404);
        abort_unless(Storage::disk('local')->exists($document->file_path), 404, 'Document file is missing.');
        $this->auditDocumentAccess($request, $patient, 'patient_document_downloaded', $document);

        return Storage::disk('local')->download($document->file_path, $document->original_name);
    }

    public function destroy(Request $request, Patient $patient, PatientDocument $document)
    {
        $this->authorizePatient($request, $patient);
        abort_unless($document->patient_id === $patient->id, 404);
        abort_unless(
            $request->user()->hasRole('admin') || $document->uploaded_by === $request->user()->id,
            403,
            'You can only delete documents you uploaded.'
        );

        Storage::disk('local')->delete($document->file_path);
        $document->delete();
        $this->auditDocumentAccess($request, $patient, 'patient_document_deleted', $document);

        return response()->json(['message' => 'Document deleted.']);
    }

    public function destroyForMe(Request $request, PatientDocument $document)
    {
        $patient = $this->myPatient($request);
        abort_unless($document->patient_id === $patient->id, 404);
        abort_unless($document->uploaded_by === $request->user()->id, 403, 'You can only delete documents you uploaded.');

        Storage::disk('local')->delete($document->file_path);
        $document->delete();
        $this->auditDocumentAccess($request, $patient, 'patient_document_deleted', $document);

        return response()->json(['message' => 'Document deleted.']);
    }

    public function photo(Request $request, Patient $patient)
    {
        $this->authorizePatient($request, $patient);
        $this->auditDocumentAccess($request, $patient, 'patient_photo_viewed');

        return $this->photoResponse($patient);
    }

    public function myPhoto(Request $request)
    {
        $patient = $this->myPatient($request);
        $this->auditDocumentAccess($request, $patient, 'patient_photo_viewed');

        return $this->photoResponse($patient);
    }

    public function updatePhoto(Request $request, Patient $patient)
    {
        $this->authorizePatient($request, $patient);

        return $this->savePhoto($request, $patient);
    }

    public function updateMyPhoto(Request $request)
    {
        return $this->savePhoto($request, $this->myPatient($request));
    }

    private function saveDocument(Request $request, Patient $patient)
    {
        $data = $request->validate([
            'title' => 'required|string|max:160',
            'document' => 'required|file|mimes:pdf,jpg,jpeg,png,doc,docx|max:10240',
        ]);

        $file = $data['document'];
        $path = $file->store("patient-documents/{$patient->id}", 'local');
        abort_if(! $path, 500, 'Could not store the document.');

        $document = $patient->documents()->create([
            'uploaded_by' => $request->user()->id,
            'title' => $data['title'],
            'original_name' => basename(str_replace('\\', '/', $file->getClientOriginalName())),
            'file_path' => $path,
            'mime_type' => $file->getMimeType() ?: 'application/octet-stream',
            'size' => $file->getSize(),
        ]);

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'patient_document_uploaded',
            'auditable_type' => PatientDocument::class,
            'auditable_id' => $document->id,
            'new_values' => ['patient_id' => $patient->id, 'title' => $document->title],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json($document->load('uploader:id,name'), 201);
    }

    private function savePhoto(Request $request, Patient $patient)
    {
        $data = $request->validate([
            'photo' => 'required|image|mimes:jpg,jpeg,png,webp|max:5120',
        ]);

        $path = $data['photo']->store("patient-photos/{$patient->id}", 'local');
        abort_if(! $path, 500, 'Could not store the patient photo.');

        $oldPath = $patient->profile_photo_path;
        $patient->profile_photo_path = $path;
        $patient->save();

        if ($patient->user) {
            $oldAvatar = $patient->user->avatar_path;
            $patient->user->avatar_path = $path;
            $patient->user->save();
            if ($oldAvatar && $oldAvatar !== $oldPath && $oldAvatar !== $path) {
                Storage::disk('local')->delete($oldAvatar);
            }
        }

        if ($oldPath && $oldPath !== $path) {
            Storage::disk('local')->delete($oldPath);
        }

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'patient_photo_updated',
            'auditable_type' => Patient::class,
            'auditable_id' => $patient->id,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json(['message' => 'Patient photo updated.']);
    }

    private function photoResponse(Patient $patient)
    {
        $path = $patient->profile_photo_path ?: $patient->user?->avatar_path;
        abort_unless($path && Storage::disk('local')->exists($path), 404);

        return response()->file(Storage::disk('local')->path($path));
    }

    private function auditDocumentAccess(Request $request, Patient $patient, string $action, ?PatientDocument $document = null): void
    {
        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => $action,
            'auditable_type' => $document ? PatientDocument::class : Patient::class,
            'auditable_id' => $document?->id ?? $patient->id,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);
    }

    private function myPatient(Request $request): Patient
    {
        $patient = $request->user()->patient;
        abort_if(! $patient, 403, 'No patient profile linked to this account.');

        return $patient;
    }

    private function authorizePatient(Request $request, Patient $patient): void
    {
        $user = $request->user();
        if ($user->hasRole('admin')) {
            return;
        }

        if ($user->hasRole('patient')) {
            abort_unless($patient->user_id === $user->id, 404);
            return;
        }

        abort_if(! $user->hasRole('doctor'), 403);
        $doctorId = $user->staffProfile?->id;
        abort_if(! $doctorId, 403, 'No staff profile linked to this doctor account.');

        $hasAppointment = $patient->appointments()->where('doctor_id', $doctorId)->exists();
        $hasVisit = $patient->visits()->where('doctor_id', $doctorId)->exists();
        $hasAdmission = $patient->admissions()->where('doctor_id', $doctorId)->exists();
        abort_unless($hasAppointment || $hasVisit || $hasAdmission, 404);
    }
}
