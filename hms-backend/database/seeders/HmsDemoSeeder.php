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

        // 7. Invoices (only if none exist — safe to re-run)
        if (\App\Models\Invoice::count() === 0) {
            $deptIds = Department::pluck('id');
            foreach (Patient::limit(30)->get() as $patient) {
                $status = fake()->randomElement(['paid', 'paid', 'paid', 'pending']);
                \App\Models\Invoice::create([
                    'patient_id' => $patient->id,
                    'department_id' => $deptIds->random(),
                    'doctor_id' => $doctorProfiles[array_rand($doctorProfiles)]->id,
                    'source' => fake()->randomElement(['reception', 'reception', 'online']),
                    'description' => fake()->randomElement(['Consultation fee', 'Laboratory tests', 'X-ray imaging', 'Pharmacy dispensing', 'Room charges', 'Physiotherapy session']),
                    'amount' => fake()->randomFloat(2, 15, 600),
                    'status' => $status,
                    'payment_method' => $status === 'paid' ? fake()->randomElement(['cash', 'card', 'transfer']) : null,
                    'paid_at' => $status === 'paid' ? now()->subDays(rand(0, 30)) : null,
                    'created_by' => $admin->id,
                ]);
            }
        }

        // 8. Inventory (only if empty)
        if (\App\Models\InventoryItem::count() === 0) {
            $deptIds = Department::pluck('id');
            $items = [
                ['Paracetamol 500mg', 'Medicine', 5, 'boxes', 20, 2.50, 'PharmaCo'],
                ['Amoxicillin 250mg', 'Medicine', 40, 'boxes', 15, 4.00, 'PharmaCo'],
                ['Surgical gloves', 'Supply', 8, 'boxes', 30, 6.50, 'MedSupply'],
                ['Syringes 5ml', 'Supply', 200, 'pcs', 100, 0.20, 'MedSupply'],
                ['BP monitor', 'Equipment', 3, 'pcs', 2, 45.00, 'EquipMed'],
                ['Insulin vials', 'Medicine', 12, 'vials', 10, 9.80, 'PharmaCo'],
                ['IV Fluid 500ml', 'Medicine', 4, 'bags', 25, 3.20, 'PharmaCo'],
            ];
            foreach ($items as $row) {
                \App\Models\InventoryItem::create([
                    'department_id' => $deptIds->random(),
                    'item_name' => $row[0], 'category' => $row[1],
                    'quantity' => $row[2], 'unit' => $row[3],
                    'min_level' => $row[4], 'unit_price' => $row[5], 'supplier' => $row[6],
                ]);
            }
        }

        // 9. Wards, beds, one demo admission (only if empty)
        if (\App\Models\Ward::count() === 0) {
            $wards = [
                ['name' => 'General Ward', 'code' => 'GW-A', 'dept' => 'GM'],
                ['name' => 'ICU', 'code' => 'ICU-1', 'dept' => 'ER'],
                ['name' => 'Emergency Ward', 'code' => 'ER-W', 'dept' => 'ER'],
                ['name' => 'Pediatric Ward', 'code' => 'PED-W', 'dept' => 'PED'],
            ];
            $allBeds = [];
            foreach ($wards as $wardData) {
                $ward = \App\Models\Ward::create([
                    'name' => $wardData['name'],
                    'code' => $wardData['code'],
                    'department_id' => Department::where('code', $wardData['dept'])->value('id'),
                ]);
                for ($i = 1; $i <= 5; $i++) {
                    $allBeds[] = $ward->beds()->create(['bed_number' => (string) $i, 'status' => 'available']);
                }
            }

            $firstBed = $allBeds[0];
            \App\Models\Admission::create([
                'patient_id' => Patient::first()->id,
                'bed_id' => $firstBed->id,
                'doctor_id' => $doctorProfiles[0]->id,
                'admitted_at' => now()->subHours(6),
                'diagnosis' => 'Post-surgery observation',
                'status' => 'admitted',
            ]);
            $firstBed->update(['status' => 'occupied']);
        }

        // 10. Announcements (only if empty)
        if (\App\Models\Announcement::count() === 0) {
            \App\Models\Announcement::create([
                'title' => 'Welcome to Dr-Bloom HMS 🎉',
                'body' => 'The hospital management system is live. Check your dashboard daily for updates.',
                'created_by' => $admin->id,
            ]);
            \App\Models\Announcement::create([
                'title' => 'Staff meeting Friday',
                'body' => 'All-staff meeting this Friday at 14:00 in the main hall. Attendance required.',
                'created_by' => $admin->id,
            ]);
        }
    }
}