<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Loads the full ICD-10 code list into icd10_codes (the diagnosis search).
 *
 *   php artisan icd10:import                         # the bundled database/data/icd10cm.csv.gz
 *   php artisan icd10:import path/to/official.csv    # any CSV/.gz with the columns: code,description
 *
 * The bundled file is an older ICD-10-CM vintage. For current billing codes download the annual CMS release,
 * save it as code,description and import that instead (rows are upserted, so re-running is safe).
 */
class ImportIcd10 extends Command
{
    protected $signature = 'icd10:import {path? : CSV or .csv.gz with "code,description" columns}';

    protected $description = 'Import ICD-10 diagnosis codes for the visit screen search';

    public function handle(): int
    {
        $path = $this->argument('path') ?: database_path('data/icd10cm.csv.gz');
        if (! is_file($path)) {
            $this->error("File not found: {$path}");

            return self::FAILURE;
        }

        $gz = str_ends_with($path, '.gz');
        $h = $gz ? gzopen($path, 'rb') : fopen($path, 'rb');
        $read = fn () => $gz ? gzgets($h) : fgets($h);
        $header = str_getcsv(trim((string) $read()));
        $ci = array_search('code', array_map('strtolower', $header), true);
        $di = array_search('description', array_map('strtolower', $header), true);
        if ($ci === false || $di === false) {
            $this->error('The first row must contain the column names "code" and "description".');

            return self::FAILURE;
        }

        $batch = [];
        $total = 0;
        $flush = function () use (&$batch, &$total) {
            if ($batch) {
                DB::table('icd10_codes')->upsert($batch, ['code'], ['description']);
                $total += count($batch);
                $batch = [];
            }
        };
        while (($line = $read()) !== false) {
            $row = str_getcsv(rtrim($line, "\r\n"));
            $code = trim((string) ($row[$ci] ?? ''));
            $desc = trim((string) ($row[$di] ?? ''));
            if ($code === '' || $desc === '' || strlen($code) > 10) {
                continue;
            }
            $batch[] = ['code' => $code, 'description' => mb_substr($desc, 0, 500)];
            if (count($batch) >= 1000) {
                $flush();
            }
        }
        $flush();
        $gz ? gzclose($h) : fclose($h);

        $this->info("Imported {$total} ICD-10 codes.");

        return self::SUCCESS;
    }
}
