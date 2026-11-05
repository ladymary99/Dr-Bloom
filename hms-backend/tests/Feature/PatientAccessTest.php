<?php

namespace Tests\Feature;

use App\Models\AccessGrant;
use App\Models\Appointment;
use App\Models\Department;
use App\Models\Patient;
use App\Models\StaffProfile;
use App\Models\User;
use Database\Seeders\RolesSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * "A doctor must not be able to open another patient's data by changing the ID in the URL."
 *
 * Needs PostgreSQL (the schema uses sequences and an exclusion constraint):
 *     DB_CONNECTION=pgsql DB_DATABASE=bloom_test php artisan test --filter=PatientAccessTest
 * On the default in-memory SQLite configuration these tests are skipped.
 */
class PatientAccessTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        if (DB::getDriverName() !== 'pgsql') {
            $this->markTestSkipped('Run against PostgreSQL: DB_CONNECTION=pgsql');
        }
        $this->seed(RolesSeeder::class);
    }

    private function staff(string $role, string $position = 'doctor'): User
    {
        $user = User::factory()->create();
        $user->assignRole($role);
        $dept = Department::firstOrCreate(['code' => 'GM'], ['name' => 'General Medicine']);
        StaffProfile::create(['user_id' => $user->id, 'employee_code' => 'E'.$user->id, 'department_id' => $dept->id, 'position' => $position, 'is_active' => true]);

        return $user->fresh();
    }

    private function book(User $doctor, Patient $patient, string $status = 'scheduled'): Appointment
    {
        return Appointment::create([
            'patient_id' => $patient->id, 'doctor_id' => $doctor->staffProfile->id,
            'appointment_at' => now()->addDays(3)->setTime(10, 0), 'duration_minutes' => 30, 'status' => $status,
        ]);
    }

    public function test_doctor_can_open_a_patient_in_their_care_but_not_a_stranger(): void
    {
        $doctor = $this->staff('doctor');
        $mine = Patient::factory()->create();
        $stranger = Patient::factory()->create();
        $this->book($doctor, $mine);
        Sanctum::actingAs($doctor);

        $this->getJson("/api/patients/{$mine->id}")->assertOk();
        $this->getJson("/api/patients/{$mine->id}/chart")->assertOk();

        foreach (["/api/patients/{$stranger->id}", "/api/patients/{$stranger->id}/chart", "/api/patients/{$stranger->id}/history",
            "/api/patients/{$stranger->id}/vaccinations", "/api/patients/{$stranger->id}/documents"] as $url) {
            $this->getJson($url)->assertStatus(403)->assertJsonPath('code', 'access_restricted');
        }
        $this->postJson('/api/lab-tests', ['patient_id' => $stranger->id, 'test_name' => 'CBC'])->assertStatus(403);
        $this->postJson('/api/visits', ['patient_id' => $stranger->id])->assertStatus(403);
        $this->postJson("/api/patients/{$stranger->id}/vaccinations", ['vaccine_name' => 'X', 'administered_on' => now()->toDateString()])->assertStatus(403);
        $this->postJson('/api/messages', ['patient_id' => $stranger->id, 'subject' => 'hi', 'body' => 'hello'])->assertStatus(403);
    }

    public function test_patient_list_only_contains_my_patients(): void
    {
        $doctor = $this->staff('doctor');
        $mine = Patient::factory()->create();
        $other = Patient::factory()->create();
        $this->book($doctor, $mine);
        Sanctum::actingAs($doctor);

        $ids = collect($this->getJson('/api/patients')->assertOk()->json('data'))->pluck('id');
        $this->assertTrue($ids->contains($mine->id));
        $this->assertFalse($ids->contains($other->id));
    }

    public function test_a_cancelled_appointment_is_not_a_care_relationship(): void
    {
        $doctor = $this->staff('doctor');
        $patient = Patient::factory()->create();
        $this->book($doctor, $patient, 'cancelled');
        Sanctum::actingAs($doctor);

        $this->getJson("/api/patients/{$patient->id}")->assertStatus(403);
    }

    public function test_break_the_glass_needs_a_real_reason_grants_time_limited_access_and_is_reviewable(): void
    {
        $doctor = $this->staff('doctor');
        $admin = $this->staff('admin', 'admin');
        $patient = Patient::factory()->create();
        Sanctum::actingAs($doctor);

        $this->postJson("/api/patients/{$patient->id}/break-glass", ['reason' => 'too short'])->assertStatus(422);

        $this->postJson("/api/patients/{$patient->id}/break-glass", ['reason' => 'Patient collapsed in the corridor, need allergy history'])->assertCreated();
        $this->getJson("/api/patients/{$patient->id}")->assertOk();
        $this->assertDatabaseHas('audit_logs', ['user_id' => $doctor->id, 'action' => 'break_glass']);

        // the grant expires
        AccessGrant::where('user_id', $doctor->id)->update(['expires_at' => now()->subMinute()]);
        $this->getJson("/api/patients/{$patient->id}")->assertStatus(403);

        // the administrator sees it in the review queue
        Sanctum::actingAs($admin);
        $grant = $this->getJson('/api/admin/access-grants')->assertOk()->json('data.0');
        $this->putJson("/api/admin/access-grants/{$grant['id']}/review", ['outcome' => 'appropriate'])->assertOk();
    }

    public function test_a_patient_account_cannot_call_staff_endpoints(): void
    {
        $user = User::factory()->create();
        $user->assignRole('patient');
        $patient = Patient::factory()->create(['user_id' => $user->id]);
        Sanctum::actingAs($user);

        $this->getJson("/api/patients/{$patient->id}/chart")->assertStatus(403);
        $this->getJson('/api/doctor/home')->assertStatus(403);
    }

    public function test_admin_is_not_restricted(): void
    {
        $admin = $this->staff('admin', 'admin');
        $patient = Patient::factory()->create();
        Sanctum::actingAs($admin);

        $this->getJson("/api/patients/{$patient->id}/chart")->assertOk();
    }
}
