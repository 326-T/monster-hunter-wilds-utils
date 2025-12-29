# データ定義 (DDL)

このドキュメントは本アプリがクライアントサイドで保持するデータ構造をまとめたものです。
サーバーは存在せず、永続化は localStorage / IndexedDB のみで行います。

## localStorage

### mhwu.tableEntries.v2

武器×属性テーブルの抽選結果を保持します。  
キーは `weapon::attribute` 形式です（例: `大剣::火属性`）。

```json
{
  "大剣::火属性": [
    {
      "id": "uuid",
      "groupSkill": "ヌシの誇り",
      "seriesSkill": "鎧竜の守護",
      "favorite": true,
      "createdAt": "2025-01-01T00:00:00.000Z",
      "cursorId": 12
    }
  ]
}
```

### mhwu.attributeCursors.v2

現在のカーソル位置（数値）。

```json
3
```

### mhwu.groupSkillVisibility.v1 / mhwu.seriesSkillVisibility.v1

表示するスキルの配列。

```json
["ヌシの誇り", "護竜の守り"]
```

### mhwu.language.v1

表示言語。

```json
"ja"
```

### OCR 互換用キー

以下は移行読み込みのためにのみ参照します（新規保存は行いません）。

- `mhwu.ocr.dataset`
- `mhwu.ocr.dataset.v1`
- `mhwu.ocr.dataset.reviewed.v1`

## IndexedDB

### DB: mhwu-ocr (version 2)

#### objectStore: ocrDataset

キー: `entryId` (string)  
値: `OcrDatasetSample`

```json
{
  "entryId": "uuid",
  "createdAt": "2025-01-01T00:00:00.000Z",
  "language": "ja",
  "tableKey": "大剣::火属性",
  "cursorId": 12,
  "seriesSkill": "鎧竜の守護",
  "groupSkill": "ヌシの誇り",
  "labelSeries": "鎧竜の守護",
  "labelGroup": "ヌシの誇り",
  "rawText": "OCR結果テキスト",
  "imageDataUrl": "data:image/png;base64,...",
  "source": "auto"
}
```

#### objectStore: ocrReviewed

キー: `entryId` (string)  
値: `true`

```json
true
```

## 命名ポリシー

既存のキー名は原則変更しません。新しいキーを追加する場合は互換性を優先します。
