<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ReportCache extends Model
{
    protected $table = 'report_cache';

    public $timestamps = false;

    protected $fillable = ['key', 'dados', 'expires_at', 'created_at'];

    protected function casts(): array
    {
        return [
            'dados' => 'array',
            'expires_at' => 'datetime',
            'created_at' => 'datetime',
        ];
    }
}
