<?php

namespace Database\Seeders;

use App\Models\Appointment;
use App\Models\Department;
use App\Models\Patient;
use App\Models\StaffProfile;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class HmsDemoSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Departments
        $departments = [
            ['name' => 'Cardiology', 'code' => 'CARD'],
            ['name' => 'Pediatrics', 'code' => 'PED'],
            ['name' => 'Emergency', 'code' => 'ER'],
            ['name' => 'General Medicine', 'code' => 'GM'],
            ['name' => 'Orthopedics', 'code' => 'ORTHO'],
        ];
        foreach ($departments as $dept) {
            Department::firstOrCreate(['code' => $dept['code']], $dept);
        }

        // 2. Admin
        $admin = User::firstOrCreate(
            ['email' => 'admin@hospital.test'],
            ['name' => 'System Admin', 'password' => Hash::make('password')]
        );
        $admin->assignRole('admin');

        // 3. Doctors (with staff profiles)
        $doctors = [
            ['name' => 'Dr. Sarah Ahmadi', 'email' => 'sarah.doctor@hospital.test', 'dept' => 'CARD', 'spec' => 'Interventional Cardiology'],
            ['name' => 'Dr. Karim Nazari', 'email' => 'karim.doctor@hospital.test', 'dept' => 'GM', 'spec' => 'Internal Medicine'],
            ['name' => 'Dr. Laila Hosseini', 'email' => 'laila.doctor@hospital.test', 'dept' => 'PED', 'spec' => 'Pediatrics'],
        ];
        $doctorProfiles = [];
        foreach ($doctors as $i => $doc) {
            $user = User::firstOrCreate(
                ['email' => $doc['email']],
                ['name' => $doc['name'], 'password' => Hash::make('password')]
            );
            $user->assignRole('doctor');

            $doctorProfiles[] = StaffProfile::firstOrCreate(
                ['employee_code' => 'DOC-00' . ($i + 1)],
                [
                    'user_id' => $user->id,
                    'department_id' => Department::where('code', $doc['dept'])->value('id'),
                    'position' => 'doctor',
                    'specialization' => $doc['spec'],
                    'phone' => '070000000' . ($i + 1),
                    'hired_at' => now()->subYears(3),
                ]
            );
        }

        // 4. Nurse + Receptionist
        $nurse = User::firstOrCreate(['email' => 'nurse@hospital.test'], ['name' => 'Fatima Rahimi', 'password' => Hash::make('password')]);
        $nurse->assignRole('nurse');
        StaffProfile::firstOrCreate(['employee_code' => 'NUR-001'], [
            'user_id' => $nurse->id,
            'department_id' => Department::where('code', 'ER')->value('id'),
            'position' => 'nurse',
            'phone' => '0700000010',
            'hired_at' => now()->subYears(2),
        ]);

        $reception = User::firstOrCreate(['email' => 'reception@hospital.test'], ['name' => 'Omid Popal', 'password' => Hash::make('password')]);
        $reception->assignRole('receptionist');

        // 5. Patients
        Patient::factory()->count(50)->create();

        // 6. Appointments for the next week
        $patients = Patient::limit(20)->get();
        foreach ($patients as $j => $patient) {
            $doctor = $doctorProfiles[$j % count($doctorProfiles)];
            Appointment::create([
                'patient_id' => $patient->id,
                'doctor_id' => $doctor->id,
                'department_id' => $doctor->department_id,
                'appointment_at' => now()->addDays(rand(0, 7))->setHour(rand(8, 16))->setMinute(0),
                'status' => 'scheduled',
                'reason' => 'Routine checkup',
            ]);
        }
    }
}