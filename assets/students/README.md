# assets/students

生徒のマスタ画像 (アイコン) 置き場。`<id>.webp` (または png / jpg / jpeg) を置いて
`python scripts/build-students.py` を実行すると、`students.master.json` の `imageUrl` に自動補完される。

- `<id>` は `data/students.master.csv` の id 列 (例: `hoshino.webp`, `hoshino-mizugi.webp`, `shiroko-terror.webp`)
- 1:1 の正方形推奨。カード表示は `object-fit: cover` / 頭部寄せ (`center top`)
- 作成には `ToolProject/imageconversion` (Icon Cropper) を使う。出力ファイル名を id に合わせること
- ユーザーが詳細モーダルからアップロードした画像 (IndexedDB) があればそちらが優先される
