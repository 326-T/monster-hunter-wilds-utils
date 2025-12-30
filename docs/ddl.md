# データ定義 (DDL)

このドキュメントは本アプリがクライアントサイドで保持するデータ構造をまとめたものです。
サーバーは存在せず、永続化は localStorage / IndexedDB のみで行います。

## localStorage

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

### 互換用キー

以下は移行読み込みのためにのみ参照します（新規保存は行いません）。

- `mhwu.tableEntries.v2`
- `mhwu.attributeCursors.v2`

移行完了後は以下にリネームされます（監査用の退避）。

- `mhwu.tableEntries.v2.migrated`
- `mhwu.attributeCursors.v2.migrated`

## IndexedDB

### DB: mhwu-app (version 1)

#### objectStore: tableEntries

キー: `id` (string)
値: `TableEntryRecord`

```json
{
  "id": "uuid",
  "tableKey": "大剣::火属性",
  "groupSkill": "ヌシの誇り",
  "seriesSkill": "鎧竜の守護",
  "favorite": true,
  "createdAt": "2025-01-01T00:00:00.000Z",
  "cursorId": 12,
  "advancedAt": "2025-01-01T00:10:00.000Z"
}
```

#### objectStore: cursorState

キー: `cursor`
値: number

```json
3
```

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
