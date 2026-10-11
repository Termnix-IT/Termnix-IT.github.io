# assets/students

生徒のマスタ画像 (アイコン) 置き場。マスタ画像の仕様はこのファイルを正とし、作成ツール側の README や `docs/data-management.md` からもここを参照している。

## 仕様

- ファイル名は `<id>.webp`。`<id>` は `data/students.master.csv` の id 列 (例: `hoshino.webp`, `hoshino-mizugi.webp`, `shiroko-terror.webp`)。png / jpg / jpeg も読めるが、同じ id に複数あると webp → png → jpg → jpeg の順で 1 つだけ使われる
- 1:1 の正方形。カードでは `object-fit: cover` / 頭部寄せ (`center top`) で表示される
- 512×512 / quality 90 を推奨 (Icon Cropper の既定値)。カードの最小幅は 140px なので、高解像度画面を考えても 512 で足りる。1024 以上はサイトで読み込む画像が無駄に重くなるため使わない
- 自作 (イラスト生成機能などで作成) した画像だけを置く。repo の中身は GitHub Pages でそのまま公開されるため、wiki などの画像は転載しない
- ユーザーが詳細モーダルからアップロードした画像 (IndexedDB) があれば、表示はそちらが優先される

## 追加の手順

1. 作成ツール [Termnix-IT/imageconversion](https://github.com/Termnix-IT/imageconversion) (Icon Cropper) で 1:1 の webp を切り出す。ツールは入力ファイル名の拡張子を `.webp` に変えて出力するので、入力ファイル名を id に合わせておく
2. 出力した webp をこのフォルダに置く
3. `python scripts/build-students.py --push` を実行する。`students.master.json` の `imageUrl` が補完され、警告がなければ画像と JSON が commit・push されてサイトに反映される (Pages のビルドに 1 分ほどかかる)。push せずに確認だけしたい場合は `--push` を付けずに実行する

`build-students.py` は次の画像を `⚠ 画像:` として警告する。`--push` なしなら JSON は書き出されるが、`--push` 付きでは commit せずに止まるので、画像を直してから再実行する。

- 正方形でない画像
- 幅か高さが 1024px 以上の画像
- ファイル名がどの id とも一致しない画像 (打ち間違いなど)

`--push` が止まるそのほかの条件は `docs/data-management.md` の「1-1. 生徒マスタ」を参照。
