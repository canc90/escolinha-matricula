<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BiSnapshot extends Model
{
    protected $table = 'bi_snapshots';

    public $timestamps = false;

    protected $fillable = ['tipo', 'periodo', 'dados'];

    protected function casts(): array
    {
        return [
            'dados' => 'array',
            'created_at' => 'datetime',
        ];
    }
}
