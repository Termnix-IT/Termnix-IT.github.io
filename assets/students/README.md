# assets/students

生徒のマスタ画像 (アイコン) 置き場。`<id>.webp` (または png / jpg / jpeg) を置いて
`python scripts/build-students.py` を実行すると、`students.master.json` の `imageUrl` に自動補完される。

マスタ画像の仕様はこのファイルを正とする (作成ツール側の README からもここを参照している)。

- `<id>` は `data/students.master.csv` の id 列 (例: `hoshino.webp`, `hoshino-mizugi.webp`, `shiroko-terror.webp`)
- 形式は webp、1:1 の正方形。カード表示は `object-fit: cover` / 頭部寄せ (`center top`)
- 出力サイズは 512×512 / quality 90 を推奨 (Icon Cropper の既定値)。カードの最小幅は 140px なので、高解像度画面を考えても 512 で足りる。1024 以上はサイトで読み込む画像が無駄に重くなるため使わない
- `build-students.py` は正方形でない画像と 1024px 以上の画像を `⚠ 画像:` として警告する (ビルドは止めない)
- 作成には [Termnix-IT/imageconversion](https://github.com/Termnix-IT/imageconversion) (Icon Cropper) を使い、自作イラストから切り出す (wiki 画像の転載はしない)。ツールは入力ファイル名の拡張子を `.webp` に変えて出力するので、入力ファイル名を id に合わせておく
- ユーザーが詳細モーダルからアップロードした画像 (IndexedDB) があればそちらが優先される
