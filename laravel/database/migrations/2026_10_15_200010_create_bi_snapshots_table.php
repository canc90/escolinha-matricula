<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bi_snapshots', function (Blueprint $table) {
            $table->id();
            $table->string('tipo', 50);
            $table->string('periodo', 20);
            $table->json('dados');
            $table->timestamp('created_at')->nullable();
            $table->index(['tipo', 'periodo']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bi_snapshots');
    }
};
