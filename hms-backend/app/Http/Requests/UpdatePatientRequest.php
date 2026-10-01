<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdatePatientRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
     public function authorize(): bool
{
    return $this->user()?->can('update patients') ?? false;
}

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */


public function rules(): array
{
    return [
        'first_name' => 'sometimes|required|string|max:100',
        'last_name' => 'sometimes|required|string|max:100',
        'date_of_birth' => 'sometimes|required|date',
        'gender' => 'sometimes|required|in:male,female,other',
        'phone' => 'nullable|string|max:20',
        'email' => 'nullable|email|max:255',
        'address' => 'nullable|string',
        'blood_type' => 'nullable|in:A+,A-,B+,AB-,AB-,O+,O-',
        'allergies' => 'nullable|string',
        'national_id' => 'nullable|string|max:50',
    ];
}
}
