<?php
function validateQuestionPayload(string $type, string $question, string $answer, $options): ?string {
    $question = trim($question);
    $answer = trim($answer);
    if ($question === '' || $answer === '') return 'Pertanyaan dan kunci jawaban wajib diisi.';

    if ($type === 'esai') {
        if (mb_strlen($question) < 25) {
            return 'Soal esai terlalu singkat. Sebutkan dengan jelas apa yang harus dihitung, ditentukan, atau dituliskan.';
        }
        if (preg_match('/\b(pilih jawaban|benar atau salah)\b/iu', $question)) return 'Redaksi tersebut tidak sesuai untuk mode esai.';
        if (preg_match('/^[A-D]$/i', $answer) || in_array(mb_strtolower($answer), ['benar', 'salah'], true)) {
            return 'Kunci esai harus berisi jawaban sebenarnya, bukan huruf pilihan atau hanya Benar/Salah.';
        }
        $hasMeasurableTask = preg_match('/\b(hitung|tentukan|tuliskan|sebutkan|selesaikan|sederhanakan|buktikan|ubah|konversikan|berapa|apakah|apa|bagaimana)\b/iu', $question)
            || str_contains($question, '?');
        if (!$hasMeasurableTask) {
            return 'Soal esai harus menyebutkan tugas yang terukur, misalnya hitung, tentukan, tuliskan, atau sebutkan.';
        }
    }

    if ($type === 'pg') {
        if (preg_match('/\b(tuliskan|jelaskan|langkah|proses pengerjaan)\b/iu', $question)) {
            return 'Soal pilihan ganda harus langsung meminta pengguna memilih jawaban, bukan menulis proses atau penjelasan.';
        }
        if (!is_array($options) || count($options) !== 4) return 'Soal pilihan ganda harus memiliki tepat empat opsi.';
        $cleanOptions = array_values(array_filter(array_map(fn($item) => trim((string)$item), $options), fn($item) => $item !== ''));
        if (count($cleanOptions) !== 4 || count(array_unique(array_map('mb_strtolower', $cleanOptions))) !== 4) {
            return 'Keempat opsi pilihan ganda harus terisi dan tidak boleh sama.';
        }
        if (!preg_match('/^[A-D]$/i', $answer)) return 'Kunci pilihan ganda harus berupa A, B, C, atau D.';
    }

    if ($type === 'tf' && !in_array(mb_strtolower($answer), ['benar', 'salah'], true)) {
        return 'Kunci soal benar/salah harus berupa Benar atau Salah.';
    }
    if ($type === 'tf' && preg_match('/\b(tuliskan|jelaskan|pilih jawaban|langkah|proses pengerjaan)\b/iu', $question)) {
        return 'Soal benar/salah harus berupa satu pernyataan yang dapat dinilai, tanpa instruksi esai atau pilihan ganda.';
    }

    return null;
}
?>
