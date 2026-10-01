<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class PatientFactory extends Factory
{
    public function definition(): array
    {
        return [
             'mrn' => 'MRN-' . date('Y') . '-' . strtoupper(\Illuminate\Support\Str::random(6)),
            'first_name' => fake()->firstName(),
            'last_name' => fake()->lastName(),
            'date_of_birth' => fake()->dateTimeBetween('-80 years', '-1 year')->format('Y-m-d'),
            'gender' => fake()->randomElement(['male', 'female']),
            'phone' => fake()->numerify('07########'),
            'email' => fake()->optional(0.5)->safeEmail(),
            'address' => fake()->address(),
            'blood_type' => fake()->randomElement(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']),
            'allergies' => fake()->optional(0.3)->randomElement(['Penicillin', 'Peanuts', 'Latex', 'Ibuprofen']),
            'national_id' => fake()->numerify('##########'),
        ];
    }
}
