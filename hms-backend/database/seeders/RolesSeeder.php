<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RolesSeeder extends Seeder
{
    public function run(): void
    {
        // Permissions
        $permissions = [
            'manage users', 'manage departments',
            'view patients', 'create patients', 'update patients', 'delete patients',
            'manage appointments',
            'manage payments',
            'manage lab', 'manage pharmacy',
            'conduct visits', 'write prescriptions',
            'view audit logs',
        ];
        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission]);
        }

        // Roles
        Role::firstOrCreate(['name' => 'admin'])
            ->givePermissionTo(Permission::all());

        Role::firstOrCreate(['name' => 'doctor'])
            ->givePermissionTo([
                'view patients', 'create patients', 'update patients',
                'manage appointments', 'conduct visits', 'write prescriptions',
            ]);

        Role::firstOrCreate(['name' => 'nurse'])
            ->givePermissionTo(['view patients', 'manage appointments']);

        Role::firstOrCreate(['name' => 'receptionist'])
            ->givePermissionTo([
                'view patients', 'create patients', 'update patients',
                'manage appointments',
            ]);

        Role::firstOrCreate(['name' => 'patient']);

        $labRole = Role::firstOrCreate(['name' => 'lab technician']);
        $labRole->givePermissionTo(['manage lab', 'view patients']);

        $pharmacistRole = Role::firstOrCreate(['name' => 'pharmacist']);
        $pharmacistRole->givePermissionTo(['manage pharmacy', 'view patients']);
    }
}