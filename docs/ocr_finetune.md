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
- `ocr-dataset/images/*.gt.txt` : 正解ラベル（シリーズ / グループを1行に連結）
- `ocr-dataset/labels.tsv` : 参照用の一覧

すでに `.box` / `.lstmf` を生成済みの場合は、再生成前に以下を実行してください。

```
cd tools/tesstrain
gmake clean-box clean-lstmf
```

## 3. 学習テキストの生成

```
node scripts/build-ocr-training-text.mjs path/to/mhwu-ocr-dataset.json
```

`ocr-dataset/training.txt` が生成されます。

## 4. Tesseract 学習

Tesseractの学習はブラウザ内では実行できないため、`tesstrain` などの外部ツールで行います。
このリポジトリでは `tools/tesstrain` を submodule として追加しており、Makefile で学習を進めます。
`START_MODEL` に使う `jpn.traineddata` は `tools/tessdata_best/` に保存しておきます。

例:

```
# ground-truth を tesstrain の想定パスへ配置
mkdir -p tools/tesstrain/data/mhwu-ground-truth
cp ocr-dataset/images/* tools/tesstrain/data/mhwu-ground-truth/

# jpn.traineddata を取得（初回のみ）
mkdir -p tools/tessdata_best
curl -L -o tools/tessdata_best/jpn.traineddata \
  https://github.com/tesseract-ocr/tessdata_best/raw/main/jpn.traineddata

# 学習の実行（jpn からのファインチューニング）
cd tools/tesstrain
gmake training MODEL_NAME=mhwu START_MODEL=jpn TESSDATA=../tessdata_best
gmake traineddata MODEL_NAME=mhwu
```

`TESSDATA` には `jpn.traineddata` が置かれたディレクトリを指定します。
`training.txt` を辞書生成に使う場合は `WORDLIST_FILE` などの変数で別途指定してください。

## 5. 学習済みパラメータの配置

`jpn.traineddata` を `public/tessdata/` に配置すると、アプリ起動時に自動で読み込みます。
（存在しない場合はデフォルトの学習データを利用します）

---

必要なら `training_text` の自動生成スクリプトも追加できます。
