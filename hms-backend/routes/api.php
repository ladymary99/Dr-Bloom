<?php

use App\Http\Controllers\Api\AppointmentController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\PatientController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\DepartmentController;
use App\Http\Controllers\Api\LookupController;
use App\Http\Controllers\Api\Admin\AuditLogController;
use App\Http\Controllers\Api\Admin\UserController as AdminUserController;
use App\Http\Controllers\Api\Admin\FinanceController;
use App\Http\Controllers\Api\InvoiceController;

   

Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:5,1'); // 5 tries/minute

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);

     Route::get('/admin/audit-logs', [AuditLogController::class, 'index'])->middleware('permission:view audit logs');

    Route::prefix('admin')->middleware('permission:manage users')->group(function () {
        Route::get('/roles', [AdminUserController::class, 'roles']);
        Route::get('/users', [AdminUserController::class, 'index']);
        Route::post('/users', [AdminUserController::class, 'store']);
        Route::put('/users/{user}', [AdminUserController::class, 'update']);
        Route::post('/users/{user}/reset-password', [AdminUserController::class, 'resetPassword']);
    });
    Route::get('/departments', [DepartmentController::class, 'index'])->middleware('permission:manage departments');
     // ...after departments routes:
    Route::get('/departments/{department}', [DepartmentController::class, 'show'])->middleware('permission:manage departments');

    Route::get('/invoices', [InvoiceController::class, 'index'])->middleware('permission:manage payments');
    Route::post('/invoices', [InvoiceController::class, 'store'])->middleware('permission:manage payments');
    Route::put('/invoices/{invoice}', [InvoiceController::class, 'update'])->middleware('permission:manage payments');

    Route::get('/admin/finance/summary', [FinanceController::class, 'summary'])->middleware('permission:manage payments');
    Route::get('/lookups/doctors', [LookupController::class, 'doctors']);
    Route::get('/dashboard/stats', [DashboardController::class, 'stats']);
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