<?php

use App\Http\Controllers\Api\AppointmentController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\PatientController;
use Illuminate\Support\Facades\Route;
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:5,1'); // 5 tries/minute

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);

    Route::get('/patients', [PatientController::class, 'index'])->middleware('permission:view patients');
    Route::post('/patients', [PatientController::class, 'store'])->middleware('permission:create patients');
    Route::get('/patients/{patient}', [PatientController::class, 'show'])->middleware('permission:view patients');
    Route::put('/patients/{patient}', [PatientController::class, 'update'])->middleware('permission:update patients');
    Route::delete('/patients/{patient}', [PatientController::class, 'destroy'])->middleware('permission:delete patients');
        Route::get('/appointments', [AppointmentController::class, 'index'])->middleware('permission:manage appointments');
    Route::post('/appointments', [AppointmentController::class, 'store'])->middleware('permission:manage appointments');
    Route::get('/appointments/{appointment}', [AppointmentController::class, 'show'])->middleware('permission:manage appointments');
    Route::put('/appointments/{appointment}', [AppointmentController::class, 'update'])->middleware('permission:manage appointments');
});