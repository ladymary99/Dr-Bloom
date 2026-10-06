<?php

use App\Http\Controllers\Api\AppointmentController;
use App\Http\Controllers\Api\Admin\StaffProfileController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\InventoryController;
use App\Http\Controllers\Api\PatientController;
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
use App\Http\Controllers\Api\VisitController;
use App\Http\Controllers\Api\SettingController;
use App\Http\Controllers\Api\AdmissionController;
use App\Http\Controllers\Api\BedController;
use App\Http\Controllers\Api\WardController;
use App\Http\Controllers\Api\AnnouncementController;
use App\Http\Controllers\Api\PortalController;
use App\Http\Controllers\Api\LabTestController;
use App\Http\Controllers\Api\PharmacyController;

   

Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:5,1'); // 5 tries/minute
Route::post('/register/patient', [AuthController::class, 'registerPatient'])->middleware('throttle:5,1');
Route::post('/patient/register', [AuthController::class, 'registerPatient'])->middleware('throttle:10,1');

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
    Route::put('/patients/{patient}', [PatientController::class, 'update'])->middleware('permission:update patients');
    Route::delete('/patients/{patient}', [PatientController::class, 'destroy'])->middleware('permission:delete patients');
    Route::get('/admin/finance/export', [FinanceController::class, 'export'])->middleware('permission:manage payments');
        Route::get('/appointments', [AppointmentController::class, 'index'])->middleware('permission:manage appointments');
    Route::post('/appointments', [AppointmentController::class, 'store'])->middleware('permission:manage appointments');
    Route::get('/appointments/{appointment}', [AppointmentController::class, 'show'])->middleware('permission:manage appointments');
    Route::put('/appointments/{appointment}', [AppointmentController::class, 'update'])->middleware('permission:manage appointments');
});

Route::middleware(['auth:sanctum', 'role:patient'])->prefix('portal')->group(function () {
    Route::get('/me', [PortalController::class, 'me']);
    Route::get('/appointments', [PortalController::class, 'appointments']);
    Route::post('/appointments', [PortalController::class, 'book']);
    Route::put('/appointments/{appointment}/cancel', [PortalController::class, 'cancel']);
    Route::get('/records', [PortalController::class, 'records']);
    Route::get('/invoices', [PortalController::class, 'invoices']);
    Route::get('/lab-tests', [PortalController::class, 'labTests']);
});