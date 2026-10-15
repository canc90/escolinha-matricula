<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AuditLog extends Model
{
    protected $table = 'audit_logs';

    public $timestamps = false;

    protected $fillable = [
        'user_id', 'role', 'action', 'entity', 'entity_id',
        'payload_before', 'payload_after', 'ip_address', 'user_agent',
    ];

    protected function casts(): array
    {
        return [
            'payload_before' => 'array',
            'payload_after' => 'array',
            'created_at' => 'datetime',
        ];
    }
}
