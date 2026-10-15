<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Log extends Model
{
    protected $table = 'logs';

    public $timestamps = false;

    protected $fillable = ['user_id', 'action', 'entity', 'entity_id', 'details'];

    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
        ];
    }
}
