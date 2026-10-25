<?php

use App\Http\Controllers\Api\BillingController;
use App\Http\Controllers\Api\DoctorAvailabilityController;
use App\Http\Controllers\Api\MessageController;
use App\Http\Controllers\Api\PortalBillingController;
use App\Http\Controllers\Api\PortalPrivacyController;
use App\Http\Controllers\Api\PortalProfileController;
use App\Http\Controllers\Api\PortalRecordsController;
use App\Http\Controllers\Api\TwoFactorController;
use App\Http\Controllers\Api\VaccinationController;
use App\Http\Controllers\Api\AppointmentController;
use App\Http\Controllers\Api\Admin\StaffProfileController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\InventoryController;
use App\Http\Controllers\Api\PatientController;
use App\Http\Controllers\Api\PatientDocumentController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\DepartmentController;
use App\Http\Controllers\Api\LookupController;
use App\Http\Controllers\Api\Admin\AuditLogController;
use App\Http\Controllers\Api\Admin\ReportController;
use App\Http\Controllers\Api\Admin\UserController as AdminUserController;
use App\Http\Controllers\Api\Admin\FinanceController;
use App\Http\Controllers\Api\InvoiceController;
use App\Http\Controllers\Api\DoctorQueueController;
use App\Http\Controllers\Api\DoctorDashboardController;
use App\Http\Controllers\Api\VisitController;
use App\Http\Controllers\Api\SettingController;
use App\Http\Controllers\Api\AdmissionController;
use App\Http\Controllers\Api\BedController;
use App\Http\Controllers\Api\WardController;
use App\Http\Controllers\Api\AnnouncementController;
use App\Http\Controllers\Api\PortalController;
use App\Http\Controllers\Api\LabTestController;
use App\Http\Controllers\Api\PharmacyController;
use App\Http\Controllers\Api\PublicController;
use App\Http\Controllers\ContactController;
   

Route::post('/webhooks/stripe', [PortalBillingController::class, 'stripeWebhook']); // verified by Stripe-Signature
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:5,1'); // 5 tries/minute
Route::post('/register/patient', [AuthController::class, 'registerPatient'])->middleware('throttle:5,1');
Route::post('/patient/register', [AuthController::class, 'registerPatient'])->middleware('throttle:10,1');
Route::post('/contact', [ContactController::class, 'store']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me/avatar', [AuthController::class, 'showAvatar']);
    Route::post('/me/avatar', [AuthController::class, 'updateAvatar']);
    Route::get('/notifications', function () {
        return auth()->user()->notifications()
            ->latest()
            ->limit(min(max((int) request('limit', 20), 1), 100))
            ->get(['id', 'type', 'data', 'read_at', 'created_at']);
    });
    Route::post('/notifications/read-all', function () {
        auth()->user()->unreadNotifications->markAsRead();

        return response()->json(['message' => 'All marked as read.']);
    });
    Route::post('/notifications/{notification}/read', function (string $notification) {
        $record = auth()->user()->notifications()->whereKey($notification)->firstOrFail();
        $record->markAsRead();

        return response()->json(['message' => 'Notification marked as read.']);
    });
    Route::get('/public/info', [PublicController::class, 'info']);
Route::get('/public/doctors', [PublicController::class, 'doctors']);

    Route::prefix('admin')->middleware('admin')->group(function () {
        Route::get('/contacts', [ContactController::class, 'index']);
        Route::patch('/contacts/{contact}/read', [ContactController::class, 'markRead']);
        Route::delete('/contacts/{contact}', [ContactController::class, 'destroy']);
    });

     Route::get('/admin/audit-logs', [AuditLogController::class, 'index'])->middleware('permission:view audit logs');

    Route::prefix('admin')->middleware('permission:manage users')->group(function () {
        Route::get('/roles', [AdminUserController::class, 'roles']);
        Route::get('/staff', [StaffProfileController::class, 'index']);
        Route::get('/users', [AdminUserController::class, 'index']);
        Route::post('/users', [AdminUserController::class, 'store']);
        Route::put('/users/{user}', [AdminUserController::class, 'update']);
        Route::post('/users/{user}/reset-password', [AdminUserController::class, 'resetPassword']);
    });
    Route::get('/departments', [DepartmentController::class, 'index'])->middleware('permission:manage departments');
    Route::post('/departments', [DepartmentController::class, 'store'])->middleware('permission:manage departments');
    Route::put('/departments/{department}', [DepartmentController::class, 'update'])->middleware('permission:manage departments');
     // ...after departments routes:
    Route::get('/departments/{department}', [DepartmentController::class, 'show'])->middleware('permission:manage departments');

    Route::get('/inventory', [InventoryController::class, 'index'])->middleware('permission:manage departments');
    Route::post('/inventory', [InventoryController::class, 'store'])->middleware('permission:manage departments');
    Route::put('/inventory/{item}', [InventoryController::class, 'update'])->middleware('permission:manage departments');
    Route::delete('/inventory/{item}', [InventoryController::class, 'destroy'])->middleware('permission:manage departments');
    Route::put('/admin/staff/{staff}', [StaffProfileController::class, 'update'])->middleware('permission:manage users');
    Route::delete('/admin/staff/{staff}', [StaffProfileController::class, 'destroy'])->middleware('permission:manage users');

    Route::get('/invoices', [InvoiceController::class, 'index'])->middleware('permission:manage payments');
    Route::post('/invoices', [InvoiceController::class, 'store'])->middleware('permission:manage payments');
    Route::put('/invoices/{invoice}', [InvoiceController::class, 'update'])->middleware('permission:manage payments');

     // ...after the invoices routes:
    Route::get('/doctor/queue', [DoctorQueueController::class, 'index'])->middleware('permission:conduct visits');
    Route::get('/doctor/dashboard', [DoctorDashboardController::class, 'dashboard'])->middleware('permission:conduct visits');
    Route::get('/doctor/department', [DoctorDashboardController::class, 'department'])->middleware('permission:conduct visits');
    Route::post('/visits', [VisitController::class, 'store'])->middleware('permission:conduct visits');
    Route::post('/visits/{visit}/prescriptions', [VisitController::class, 'addPrescription'])->middleware('permission:write prescriptions');
    Route::get('/patients/{patient}/history', [VisitController::class, 'patientHistory'])->middleware('permission:view patients');

    Route::get('/admin/finance/summary', [FinanceController::class, 'summary'])->middleware('permission:manage payments');
    Route::get('/admin/reports/collection', [ReportController::class, 'collection'])->middleware('permission:manage payments');
    Route::get('/admin/reports/doctors', [ReportController::class, 'doctors'])->middleware('permission:manage payments');
    Route::get('/admin/reports/export/{type}', [ReportController::class, 'export'])->middleware('permission:manage payments');
    Route::get('/announcements', [AnnouncementController::class, 'index']);
    Route::get('/admin/announcements', [AnnouncementController::class, 'adminIndex'])->middleware('role:admin');
    Route::post('/admin/announcements', [AnnouncementController::class, 'store'])->middleware('role:admin');
    Route::put('/admin/announcements/{announcement}', [AnnouncementController::class, 'update'])->middleware('role:admin');
    Route::delete('/admin/announcements/{announcement}', [AnnouncementController::class, 'destroy'])->middleware('role:admin');
    Route::get('/settings', [SettingController::class, 'index']);
    Route::put('/settings', [SettingController::class, 'update'])->middleware('role:admin');
    Route::put('/me/password', [AuthController::class, 'updatePassword']);
    Route::get('/wards', [WardController::class, 'index']);
    Route::post('/wards', [WardController::class, 'store'])->middleware('permission:manage departments');
    Route::delete('/wards/{ward}', [WardController::class, 'destroy'])->middleware('permission:manage departments');
    Route::post('/wards/{ward}/beds', [WardController::class, 'addBed'])->middleware('permission:manage departments');
    Route::put('/beds/{bed}', [BedController::class, 'update'])->middleware('permission:manage departments');
    Route::get('/admissions', [AdmissionController::class, 'index']);
    Route::post('/admissions', [AdmissionController::class, 'store'])->middleware('permission:view patients');
    Route::put('/admissions/{admission}/discharge', [AdmissionController::class, 'discharge'])->middleware('permission:view patients');
    Route::get('/lookups/doctors', [LookupController::class, 'doctors']);
    Route::get('/dashboard/stats', [DashboardController::class, 'stats']);
    Route::get('/lab-tests', [LabTestController::class, 'index'])->middleware('permission:manage lab');
    Route::post('/lab-tests', [LabTestController::class, 'store'])->middleware('permission:conduct visits');
    Route::get('/lab-tests/{labTest}', [LabTestController::class, 'show'])->middleware('permission:manage lab');
    Route::put('/lab-tests/{labTest}', [LabTestController::class, 'update'])->middleware('permission:manage lab');

    Route::get('/pharmacy/prescriptions', [PharmacyController::class, 'prescriptions'])->middleware('permission:manage pharmacy');
    Route::post('/pharmacy/prescriptions/{prescription}/dispense', [PharmacyController::class, 'dispense'])->middleware('permission:manage pharmacy');
    Route::get('/pharmacy/stock', [PharmacyController::class, 'stock'])->middleware('permission:manage pharmacy');
    Route::post('/pharmacy/sale', [PharmacyController::class, 'sale'])->middleware('permission:manage pharmacy');

    Route::get('/patients', [PatientController::class, 'index'])->middleware('permission:view patients');
    Route::post('/patients', [PatientController::class, 'store'])->middleware('permission:create patients');
    Route::get('/patients/{patient}', [PatientController::class, 'show'])->middleware('permission:view patients');
    Route::get('/patients/{patient}/photo', [PatientDocumentController::class, 'photo'])->middleware('permission:view patients');
    Route::post('/patients/{patient}/photo', [PatientDocumentController::class, 'updatePhoto'])->middleware('permission:view patients');
    Route::get('/patients/{patient}/documents', [PatientDocumentController::class, 'index'])->middleware('permission:view patients');
    Route::post('/patients/{patient}/documents', [PatientDocumentController::class, 'store'])->middleware('permission:view patients');
    Route::get('/patients/{patient}/documents/{document}', [PatientDocumentController::class, 'download'])->middleware('permission:view patients');
    Route::delete('/patients/{patient}/documents/{document}', [PatientDocumentController::class, 'destroy'])->middleware('permission:view patients');
    Route::put('/patients/{patient}', [PatientController::class, 'update'])->middleware('permission:update patients');
    Route::delete('/patients/{patient}', [PatientController::class, 'destroy'])->middleware('permission:delete patients');
    Route::get('/admin/finance/export', [FinanceController::class, 'export'])->middleware('permission:manage payments');
        Route::get('/appointments', [AppointmentController::class, 'index'])->middleware('permission:manage appointments');
    Route::post('/appointments', [AppointmentController::class, 'store'])->middleware('permission:manage appointments');
    Route::get('/appointments/{appointment}', [AppointmentController::class, 'show'])->middleware('permission:manage appointments');
    Route::put('/appointments/{appointment}', [AppointmentController::class, 'update'])->middleware('permission:manage appointments');
});

// ───────────── staff-side features that feed the patient portal ─────────────
Route::middleware('auth:sanctum')->group(function () {
    // 2FA (any role)
    Route::post('/2fa/setup', [TwoFactorController::class, 'setup'])->middleware('throttle:10,1');
    Route::post('/2fa/confirm', [TwoFactorController::class, 'confirm'])->middleware('throttle:10,1');
    Route::post('/2fa/disable', [TwoFactorController::class, 'disable'])->middleware('throttle:10,1');

    // secure messaging (patients and staff share the endpoints; the controller scopes by role)
    Route::get('/messages', [MessageController::class, 'index']);
    Route::post('/messages', [MessageController::class, 'store'])->middleware('throttle:20,1');
    Route::get('/messages/{thread}', [MessageController::class, 'show']);
    Route::post('/messages/{thread}/reply', [MessageController::class, 'reply'])->middleware('throttle:30,1');

    // doctor schedule
    Route::middleware('permission:conduct visits')->group(function () {
        Route::get('/doctor/availability', [DoctorAvailabilityController::class, 'show']);
        Route::put('/doctor/availability', [DoctorAvailabilityController::class, 'update']);
        Route::post('/doctor/time-off', [DoctorAvailabilityController::class, 'addTimeOff']);
        Route::delete('/doctor/time-off/{timeOff}', [DoctorAvailabilityController::class, 'removeTimeOff']);
        Route::put('/visits/{visit}/sharing', [VisitController::class, 'updateSharing']);
    });
    Route::get('/admin/doctor-availability', [DoctorAvailabilityController::class, 'show'])->middleware('role:admin');
    Route::put('/admin/doctor-availability', [DoctorAvailabilityController::class, 'update'])->middleware('role:admin');

    // results: upload (lab), release/view (lab or doctor)
    Route::post('/lab-tests/{labTest}/file', [LabTestController::class, 'uploadFile'])->middleware('permission:manage lab');
    Route::get('/lab-tests/{labTest}/file', [LabTestController::class, 'downloadFile'])->middleware('permission:manage lab|conduct visits');
    Route::post('/lab-tests/{labTest}/release', [LabTestController::class, 'release'])->middleware('permission:manage lab|conduct visits');

    // vaccinations
    Route::get('/patients/{patient}/vaccinations', [VaccinationController::class, 'index'])->middleware('permission:view patients');
    Route::post('/patients/{patient}/vaccinations', [VaccinationController::class, 'store'])->middleware('permission:conduct visits');
    Route::delete('/patients/{patient}/vaccinations/{vaccination}', [VaccinationController::class, 'destroy'])->middleware('permission:conduct visits');

    // billing ledger
    Route::middleware('permission:manage payments')->group(function () {
        Route::get('/invoices/{invoice}', [BillingController::class, 'show']);
        Route::post('/invoices/{invoice}/items', [BillingController::class, 'addItem']);
        Route::post('/invoices/{invoice}/payments', [BillingController::class, 'recordPayment'])->middleware('throttle:60,1');
        Route::get('/claims', [BillingController::class, 'claims']);
        Route::post('/invoices/{invoice}/claims', [BillingController::class, 'storeClaim']);
        Route::put('/claims/{claim}', [BillingController::class, 'updateClaim']);
    });
    Route::post('/payments/{payment}/refund', [BillingController::class, 'refund'])->middleware('role:admin');

    // GDPR-style requests (admin)
    Route::get('/admin/data-requests', [PortalPrivacyController::class, 'adminIndex'])->middleware('role:admin');
    Route::put('/admin/data-requests/{dataRequest}', [PortalPrivacyController::class, 'adminUpdate'])->middleware('role:admin');
});


Route::middleware(['auth:sanctum', 'role:patient'])->prefix('portal')->group(function () {
    // dashboard + profile
    Route::get('/me', [PortalController::class, 'me']);
    Route::get('/announcements', [AnnouncementController::class, 'portal']);
    Route::get('/profile', [PortalProfileController::class, 'show']);
    Route::put('/profile', [PortalProfileController::class, 'update']);
    Route::put('/preferences', [PortalProfileController::class, 'preferences']);
    Route::put('/email', [PortalProfileController::class, 'changeEmail'])->middleware('throttle:5,1');
    Route::get('/consents', [PortalProfileController::class, 'consents']);
    Route::post('/consents', [PortalProfileController::class, 'acceptConsent']);
    Route::get('/photo', [PatientDocumentController::class, 'myPhoto']);
    Route::post('/photo', [PatientDocumentController::class, 'updateMyPhoto']);

    // booking
    Route::get('/doctor-filters', [PortalController::class, 'doctorFilters']);
    Route::get('/doctors', [PortalController::class, 'doctors']);
    Route::get('/doctors/{doctor}', [PortalController::class, 'doctor']);
    Route::get('/doctors/{doctor}/photo', [PortalController::class, 'doctorPhoto']);
    Route::get('/doctors/{doctor}/slots', [PortalController::class, 'slots']);
    Route::get('/appointments', [PortalController::class, 'appointments']);
    Route::post('/appointments', [PortalController::class, 'book'])->middleware('throttle:15,1');
    Route::put('/appointments/{appointment}/cancel', [PortalController::class, 'cancel']);
    Route::put('/appointments/{appointment}/reschedule', [PortalController::class, 'reschedule'])->middleware('throttle:15,1');
    Route::get('/appointments/{appointment}/ics', [PortalController::class, 'ics']);

    // medical records
    Route::get('/records', [PortalRecordsController::class, 'records']);
    Route::get('/prescriptions', [PortalRecordsController::class, 'prescriptions']);
    Route::get('/prescriptions/{prescription}', [PortalRecordsController::class, 'prescription']);
    Route::get('/lab-tests', [PortalRecordsController::class, 'labTests']);
    Route::get('/lab-tests/{labTest}/file', [PortalRecordsController::class, 'labFile']);
    Route::get('/vaccinations', [PortalRecordsController::class, 'vaccinations']);

    // documents (private disk, streamed through the API, never a public URL)
    Route::get('/documents', [PatientDocumentController::class, 'myDocuments']);
    Route::post('/documents', [PatientDocumentController::class, 'storeForMe'])->middleware('throttle:20,1');
    Route::get('/documents/{document}', [PatientDocumentController::class, 'downloadForMe']);
    Route::delete('/documents/{document}', [PatientDocumentController::class, 'destroyForMe']);

    // billing
    Route::get('/invoices', [PortalBillingController::class, 'invoices']);
    Route::get('/invoices/{invoice}', [PortalBillingController::class, 'invoice']);
    Route::post('/invoices/{invoice}/pay', [PortalBillingController::class, 'pay'])->middleware('throttle:10,1');
    Route::get('/payments/{payment}/receipt', [PortalBillingController::class, 'receipt']);
    Route::get('/claims', [PortalBillingController::class, 'claims']);

    // messaging helper (list of people the patient can write to)
    Route::get('/care-team', [MessageController::class, 'careTeam']);

    // privacy
    Route::get('/privacy/requests', [PortalPrivacyController::class, 'requests']);
    Route::post('/privacy/requests', [PortalPrivacyController::class, 'createRequest'])->middleware('throttle:5,1');
    Route::get('/privacy/export', [PortalPrivacyController::class, 'export'])->middleware('throttle:5,10');
});
