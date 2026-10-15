<?php

namespace App\Support;

use App\Models\AuditLog;
use Illuminate\Support\Facades\Auth;

class Audit
{
    public static function log(
        string $action,
        ?string $entity = null,
        $entityId = null,
        $before = null,
        $after = null,
    ): void {
        AuditLog::create([
            'user_id' => Auth::id(),
            'role' => Auth::user()?->role,
            'action' => $action,
            'entity' => $entity,
            'entity_id' => $entityId,
            'payload_before' => $before,
            'payload_after' => $after,
            'ip_address' => request()->ip(),
            'user_agent' => mb_substr((string) request()->userAgent(), 0, 500),
            'created_at' => now(),
        ]);
    }
}
