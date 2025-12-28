# OCR ファインチューニング用データの準備

このアプリの開発者モードで収集したOCRデータを、Tesseractの学習用に整形します。

## 1. データのエクスポート

`npm run dev` 実行中にOCRを行うと、ローカルストレージにデータが保存されます。
画面にUIは出さないため、ブラウザのコンソールで以下を実行して取得します。

```
window.mhwuExportOcrDataset()
```

必要なら内容だけ取得する場合は:

```
window.mhwuGetOcrDataset()
```

## 1.5. データの確認（開発用）

開発環境では `/dev/ocr-dataset` にアクセスすると、保存された画像と学習用ラベルを確認・編集できます。
ここで編集するラベルは学習用であり、アプリの記録データには影響しません。

## 2. 画像とラベルの生成

```
node scripts/prepare-ocr-dataset.mjs path/to/mhwu-ocr-dataset.json
```

以下が生成されます:

- `ocr-dataset/images/*.png` : OCR入力画像
- `ocr-dataset/images/*.gt.txt` : 正解ラベル（シリーズ/グループの2行）
- `ocr-dataset/labels.tsv` : 参照用の一覧

## 3. 学習テキストの生成

```
node scripts/build-ocr-training-text.mjs path/to/mhwu-ocr-dataset.json
```

`ocr-dataset/training.txt` が生成されます。

## 4. Tesseract 学習

Tesseractの学習はブラウザ内では実行できないため、`tesstrain` などの外部ツールで行います。
学習環境は別途用意してください。

例:

```
# テンプレート。実行環境に合わせて調整してください。
tesstrain.sh \
  --lang jpn \
  --linedata_only \
  --noextract_font_properties \
  --langdata_dir /path/to/langdata \
  --tessdata_dir /path/to/tessdata \
  --output_dir /path/to/output \
  --training_text /path/to/training.txt \
  --gt_dir /path/to/ocr-dataset/images
```

`training_text` には `ocr-dataset/training.txt` を使います。

## 5. 学習済みパラメータの配置

`jpn.traineddata` を `public/tessdata/` に配置すると、アプリ起動時に自動で読み込みます。
（存在しない場合はデフォルトの学習データを利用します）

---

必要なら `training_text` の自動生成スクリプトも追加できます。
