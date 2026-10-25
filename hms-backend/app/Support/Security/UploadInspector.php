<?php

namespace App\Support\Security;

use InvalidArgumentException;

/**
 * Server-side upload validation: extension allow-list, real MIME sniffing, magic bytes,
 * size cap, active-content heuristics, optional ClamAV. Never trusts the client's MIME/name.
 */
final class UploadInspector
{
    /** ext => acceptable sniffed MIME types */
    public const MEDICAL = [
        'pdf' => ['application/pdf'],
        'jpg' => ['image/jpeg'],
        'jpeg' => ['image/jpeg'],
        'png' => ['image/png'],
        'webp' => ['image/webp'],
        'docx' => ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/zip', 'application/octet-stream'],
    ];

    /**
     * @param  array<string,list<string>>  $allowed
     * @return array{extension:string,mime:string,size:int,sha256:string,scan_status:string}
     */
    public static function inspect(string $path, string $clientName, int $maxBytes = 10485760, array $allowed = self::MEDICAL, bool $clamav = false): array
    {
        if (! is_file($path)) {
            throw new InvalidArgumentException('Upload could not be read.');
        }
        $size = filesize($path);
        if ($size === 0 || $size > $maxBytes) {
            throw new InvalidArgumentException('File is empty or larger than '.round($maxBytes / 1048576).' MB.');
        }

        $ext = strtolower(pathinfo(str_replace('\\', '/', $clientName), PATHINFO_EXTENSION));
        if (! isset($allowed[$ext])) {
            throw new InvalidArgumentException('File type not allowed. Accepted: '.implode(', ', array_keys($allowed)).'.');
        }

        // Double extensions such as report.php.pdf
        if (preg_match('/\.(php\d?|phtml|phar|exe|js|sh|bat|cmd|html?|svg)\./i', basename($clientName))) {
            throw new InvalidArgumentException('Suspicious file name.');
        }

        $mime = (new \finfo(FILEINFO_MIME_TYPE))->file($path) ?: 'application/octet-stream';
        if (! in_array($mime, $allowed[$ext], true)) {
            throw new InvalidArgumentException("File content ($mime) does not match its .$ext extension.");
        }

        $head = (string) file_get_contents($path, false, null, 0, 8);
        $magicOk = match (true) {
            $ext === 'pdf' => str_starts_with($head, '%PDF-'),
            in_array($ext, ['jpg', 'jpeg'], true) => str_starts_with($head, "\xFF\xD8\xFF"),
            $ext === 'png' => str_starts_with($head, "\x89PNG\r\n\x1A\n"),
            $ext === 'webp' => str_starts_with($head, 'RIFF'),
            $ext === 'docx' => str_starts_with($head, 'PK'),
            default => false,
        };
        if (! $magicOk) {
            throw new InvalidArgumentException('File header is invalid or corrupted.');
        }

        $sample = (string) file_get_contents($path, false, null, 0, 5 * 1048576);
        if ($ext === 'pdf' && preg_match('#/(JavaScript|JS|Launch|OpenAction|AA)\b#', $sample)) {
            throw new InvalidArgumentException('PDFs with embedded scripts or launch actions are not accepted.');
        }
        if ($ext === 'docx' && (str_contains($sample, 'vbaProject.bin') || str_contains($sample, 'macrosheets'))) {
            throw new InvalidArgumentException('Documents containing macros are not accepted.');
        }
        if (in_array($ext, ['jpg', 'jpeg', 'png', 'webp'], true) && preg_match('/<\?php|<script/i', $sample)) {
            throw new InvalidArgumentException('Image contains embedded code.');
        }

        return [
            'extension' => $ext === 'jpeg' ? 'jpg' : $ext,
            'mime' => $mime,
            'size' => $size,
            'sha256' => hash_file('sha256', $path),
            'scan_status' => $clamav ? self::clamScan($path) : 'unscanned',
        ];
    }

    /** Fails closed: scanner error or infection rejects the upload. */
    private static function clamScan(string $path): string
    {
        $bin = trim((string) shell_exec('command -v clamdscan || command -v clamscan'));
        if ($bin === '') {
            throw new InvalidArgumentException('Virus scanner is unavailable, so the upload was refused.');
        }
        exec(escapeshellarg($bin).' --no-summary '.escapeshellarg($path).' 2>&1', $out, $code);
        if ($code === 1) {
            throw new InvalidArgumentException('The file was flagged as malicious and rejected.');
        }
        if ($code !== 0) {
            throw new InvalidArgumentException('Virus scan failed, so the upload was refused.');
        }

        return 'clean';
    }
}
