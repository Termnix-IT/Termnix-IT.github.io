#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
data/students.master.csv → data/students.master.json

CSV を本番データ JSON に変換する。アプリは JSON を fetch するため、
CSV を編集したら必ず本スクリプトを実行して JSON を再生成する。

Usage:
    python scripts/build-students.py           # JSON を再生成するだけ
    python scripts/build-students.py --push    # 問題がなければ commit → push まで行う

--push の動作:
- 対象は assets/students/ の画像と data/students.master.{csv,json} だけ。それ以外の未コミット変更は触らない
- ビルドエラー・画像の警告がある、upstream が無い、remote に未取り込みのコミットがある場合は commit しない
- 現在のブランチをその upstream へ通常の push で送る (force push はしない)

バリデーション:
- id: 必須・英小文字+数字+ハイフンのみ・重複禁止
- name / school: 必須・空文字禁止 (school は任意の文字列を許可。新学校追加可)
- role: ROLES のいずれか
- rarity: 1 / 2 / 3
- attackType: ATTACK_TYPES のいずれか
- armorType: ARMOR_TYPES のいずれか
- position: POSITIONS のいずれか
- imageUrl: 任意 (空可)

画像チェック (警告のみ・ビルドは止めない):
- assets/ 配下のローカル画像が正方形でない、または 1024px 以上なら警告する
  (仕様は assets/students/README.md。推奨は 512×512)
- assets/students/ にあるのに、ファイル名がどの id とも一致しない画像も警告する

新学校を追加した場合の影響:
- フィルタ・グルーピングは自動対応 (動的検出)
- 表示順を制御したい場合は data/constants.js の SCHOOLS 配列に追加
- 専用カラーを当てたい場合は data/constants.js の SCHOOL_COLORS に追加
"""

import argparse
import csv
import json
import re
import struct
import subprocess
import sys
from pathlib import Path

# Windows コンソール (cp932) でも UTF-8 で出力できるよう再設定
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

# プロジェクトルートをこのスクリプトの親の親に固定
ROOT      = Path(__file__).resolve().parent.parent
CSV_PATH  = ROOT / 'data' / 'students.master.csv'
JSON_PATH = ROOT / 'data' / 'students.master.json'
IMG_DIR   = ROOT / 'assets' / 'students'
IMG_EXTS  = ('.webp', '.png', '.jpg', '.jpeg')  # 優先順
IMG_MAX_SIDE = 1024  # これ以上は重すぎるので警告 (推奨 512)

# --push で commit する対象 (git の pathspec。ROOT からの相対)
PUBLISH_PATHS = ['data/students.master.csv', 'data/students.master.json'] + \
                [f'assets/students/*{ext}' for ext in IMG_EXTS]

# enum: data/constants.js の定数と一致させること
CLASSES      = {'アタッカー', 'タンク', 'ヒーラー', 'サポーター', 'T.S'}
ATTACK_TYPES = {'explosive', 'piercing', 'mystic', 'sonic', 'decomposition'}
ARMOR_TYPES  = {'light', 'heavy', 'special', 'elastic', 'compositearmor'}
ROLES        = {'striker', 'special'}
POSITIONS    = {'FRONT', 'MIDDLE', 'BACK'}
WEAPONS      = {'HG', 'AR', 'SG', 'SMG', 'SL', 'MG', 'GL', 'RL', 'FT', 'MT', 'RG'}
OBTAINS      = {'permanent', 'limited', 'event'}
RARITIES     = {1, 2, 3}
ID_PATTERN   = re.compile(r'^[a-z0-9-]+$')

# class / role / position / weapon は必須列だが、position と weapon は空文字を許容
REQUIRED_COLS = ['id', 'name', 'school', 'class', 'rarity',
                 'attackType', 'armorType', 'role', 'position', 'weapon',
                 'obtainability']
OPTIONAL_COLS = ['imageUrl']
ALL_COLS      = REQUIRED_COLS + OPTIONAL_COLS


def read_csv(path: Path):
    if not path.exists():
        raise FileNotFoundError(f'CSV が見つかりません: {path}')
    with path.open('r', encoding='utf-8-sig', newline='') as f:
        reader = csv.DictReader(f)
        if reader.fieldnames is None:
            raise ValueError('CSV ヘッダー行がありません')
        missing = [c for c in REQUIRED_COLS if c not in reader.fieldnames]
        if missing:
            raise ValueError(f'CSV に必須列がありません: {missing}')
        return list(reader)


def validate_and_convert(rows):
    """CSV 行をバリデーションしつつ dict のリストに変換。エラーは集約して報告。"""
    errors = []
    seen_ids = {}  # id -> 行番号
    out = []

    for i, row in enumerate(rows, start=2):  # ヘッダーが1行目なのでデータは2行目から
        # 全フィールド空の行はスキップ (衣装違いの区切り用の空行を許容)
        if not any((v or '').strip() for v in row.values()):
            continue
        rid    = (row.get('id')       or '').strip()
        name   = (row.get('name')     or '').strip()
        school = (row.get('school')   or '').strip()
        cls    = (row.get('class')    or '').strip()
        rstr   = (row.get('rarity')   or '').strip()
        atk    = (row.get('attackType') or '').strip()
        arm    = (row.get('armorType')  or '').strip()
        role   = (row.get('role')       or '').strip()
        pos    = (row.get('position')   or '').strip()
        wpn    = (row.get('weapon')     or '').strip()
        obt    = (row.get('obtainability') or '').strip()
        img    = (row.get('imageUrl')   or '').strip()

        # id
        if not rid:
            errors.append(f'行{i}: id が空です')
        elif not ID_PATTERN.match(rid):
            errors.append(f"行{i}: id '{rid}' は不正(英小文字・数字・ハイフンのみ)")
        elif rid in seen_ids:
            errors.append(f"行{i}: id '{rid}' が重複(行{seen_ids[rid]}と)")
        else:
            seen_ids[rid] = i

        # name / school
        if not name:
            errors.append(f'行{i}: name が空です')
        if not school:
            errors.append(f'行{i}: school が空です')

        # class
        if cls not in CLASSES:
            errors.append(f"行{i}: class '{cls}' は不正(候補: {sorted(CLASSES)})")

        # rarity
        try:
            rarity = int(rstr)
            if rarity not in RARITIES:
                raise ValueError
        except ValueError:
            errors.append(f"行{i}: rarity '{rstr}' は不正(1/2/3 のいずれか)")
            rarity = None

        # attackType
        if atk not in ATTACK_TYPES:
            errors.append(f"行{i}: attackType '{atk}' は不正(候補: {sorted(ATTACK_TYPES)})")

        # armorType
        if arm not in ARMOR_TYPES:
            errors.append(f"行{i}: armorType '{arm}' は不正(候補: {sorted(ARMOR_TYPES)})")

        # role (旧 position: ストライカー/スペシャル)
        if role not in ROLES:
            errors.append(f"行{i}: role '{role}' は不正(候補: {sorted(ROLES)})")

        # position (FRONT/MIDDLE/BACK, 空可)
        if pos and pos not in POSITIONS:
            errors.append(f"行{i}: position '{pos}' は不正(候補: {sorted(POSITIONS)} または空)")

        # weapon (HG/AR/..., 空可)
        if wpn and wpn not in WEAPONS:
            errors.append(f"行{i}: weapon '{wpn}' は不正(候補: {sorted(WEAPONS)} または空)")

        # obtainability (permanent/limited/event)
        if obt not in OBTAINS:
            errors.append(f"行{i}: obtainability '{obt}' は不正(候補: {sorted(OBTAINS)})")

        # 行に致命的エラーが無ければ出力候補に追加
        pos_ok = (not pos) or (pos in POSITIONS)
        wpn_ok = (not wpn) or (wpn in WEAPONS)
        if rid and rid in seen_ids and seen_ids[rid] == i and rarity is not None \
                and cls in CLASSES and atk in ATTACK_TYPES \
                and arm in ARMOR_TYPES and role in ROLES \
                and pos_ok and wpn_ok and obt in OBTAINS \
                and name and school:
            record = {
                'id':         rid,
                'name':       name,
                'school':     school,
                'class':      cls,
                'rarity':     rarity,
                'attackType': atk,
                'armorType':  arm,
                'role':       role,
                'position':   pos,
                'weapon':     wpn,
                'obtainability': obt,
            }
            # imageUrl 解決: CSV 指定が最優先、なければ assets/students/<id>.<ext> を自動検出
            if img:
                record['imageUrl'] = img
            else:
                for ext in IMG_EXTS:
                    candidate = IMG_DIR / f'{rid}{ext}'
                    if candidate.exists():
                        record['imageUrl'] = f'assets/students/{rid}{ext}'
                        break
            out.append(record)

    return out, errors


def read_image_size(path: Path):
    """webp / png / jpeg のヘッダーから (幅, 高さ) を読む。Pillow を使わず標準ライブラリだけで判定する。
    読めない形式なら None。"""
    with path.open('rb') as f:
        head = f.read(32)
        # PNG: シグネチャ 8byte + IHDR チャンク (幅・高さはビッグエンディアン 4byte)
        if head[:8] == b'\x89PNG\r\n\x1a\n' and head[12:16] == b'IHDR':
            return struct.unpack('>II', head[16:24])
        # WebP: RIFF コンテナ。先頭チャンクの種類でレイアウトが異なる
        if head[:4] == b'RIFF' and head[8:12] == b'WEBP':
            chunk = head[12:16]
            if chunk == b'VP8X':  # 拡張形式 (アルファ付き等): 幅-1 / 高さ-1 が 3byte LE
                w = int.from_bytes(head[24:27], 'little') + 1
                h = int.from_bytes(head[27:30], 'little') + 1
                return w, h
            if chunk == b'VP8L':  # ロスレス: 1byte シグネチャの後に 14bit ずつ
                bits = int.from_bytes(head[21:25], 'little')
                return (bits & 0x3FFF) + 1, ((bits >> 14) & 0x3FFF) + 1
            if chunk == b'VP8 ':  # ロッシー: フレームヘッダーの後に 14bit ずつ
                w, h = struct.unpack('<HH', head[26:30])
                return w & 0x3FFF, h & 0x3FFF
            return None
        # JPEG: SOFn マーカーを探して高さ・幅を読む
        if head[:2] == b'\xff\xd8':
            f.seek(2)
            while True:
                marker = f.read(2)
                if len(marker) < 2 or marker[0] != 0xFF:
                    return None
                code = marker[1]
                if code in (0xD8, 0x01) or 0xD0 <= code <= 0xD7:
                    continue
                seg_len = struct.unpack('>H', f.read(2))[0]
                if 0xC0 <= code <= 0xCF and code not in (0xC4, 0xC8, 0xCC):
                    h, w = struct.unpack('>xHH', f.read(5))
                    return w, h
                f.seek(seg_len - 2, 1)
    return None


def check_images(records):
    """ローカルのマスタ画像が仕様 (1:1・1024px 未満) に沿っているか調べ、警告文のリストを返す。"""
    warnings = []
    for r in records:
        url = r.get('imageUrl')
        if not url or not url.startswith('assets/'):
            continue  # 外部 URL は対象外
        path = ROOT / url
        if not path.exists():
            warnings.append(f"{r['id']}: 画像ファイルがありません ({url})")
            continue
        try:
            size = read_image_size(path)
        except (OSError, struct.error):
            size = None
        if size is None:
            warnings.append(f"{r['id']}: 画像サイズを読み取れません ({url})")
            continue
        w, h = size
        if w != h:
            warnings.append(f"{r['id']}: 正方形ではありません {w}×{h} ({url})")
        if max(w, h) >= IMG_MAX_SIDE:
            warnings.append(f"{r['id']}: {w}×{h} は大きすぎます。512×512 を推奨 ({url})")

    # ファイル名の打ち間違いなどで、どの生徒にも紐づかない画像
    ids = {r['id'] for r in records}
    if IMG_DIR.exists():
        for p in sorted(IMG_DIR.iterdir()):
            if p.suffix.lower() in IMG_EXTS and p.stem not in ids:
                warnings.append(f'{p.name}: ファイル名に一致する id がありません')
    return warnings


def git(*args):
    """ROOT で git を実行し、標準出力を返す。失敗したら CalledProcessError。"""
    res = subprocess.run(['git', '-c', 'core.quotepath=false', *args], cwd=ROOT,
                         capture_output=True, text=True, encoding='utf-8')
    if res.returncode != 0:
        raise subprocess.CalledProcessError(res.returncode, ['git', *args],
                                            res.stdout, res.stderr)
    return res.stdout.strip()


def commit_message(name_status):
    """`git diff --cached --name-status` の結果から commit メッセージを作る。"""
    images = {'A': [], 'M': [], 'D': []}  # 追加 / 更新 / 削除
    for line in name_status.splitlines():
        status, path = line.split('\t', 1)
        if path.startswith('assets/students/'):
            images.setdefault(status, []).append(Path(path).stem)
    labels = {'A': '追加', 'M': '更新', 'D': '削除'}
    kinds = [k for k in labels if images[k]]
    if not kinds:
        subject = 'update: 生徒マスタを更新'
    elif len(kinds) == 1:
        prefix = {'A': 'add', 'M': 'update', 'D': 'remove'}[kinds[0]]
        subject = f"{prefix}: 生徒のマスタ画像を{labels[kinds[0]]} ({', '.join(images[kinds[0]])})"
    else:
        detail = ' / '.join(f"{labels[k]}: {', '.join(images[k])}" for k in kinds)
        subject = f'update: 生徒のマスタ画像を変更 ({detail})'
    return f'{subject}\n\n{name_status}\n'


def publish():
    """PUBLISH_PATHS の変更だけを commit し、現在のブランチの upstream へ push する。
    戻り値は終了コード (0 = 成功または変更なし)。"""
    try:
        branch = git('rev-parse', '--abbrev-ref', 'HEAD')
        try:
            upstream = git('rev-parse', '--abbrev-ref', '@{u}')
        except subprocess.CalledProcessError:
            print(f'✗ push 中止: ブランチ {branch} に upstream がありません', file=sys.stderr)
            return 4
        # 一致しない pathspec を add / commit に渡すとエラーになるため、変更のあるファイルを列挙して渡す
        changed = git('diff', '--name-only', '--no-renames', 'HEAD', '--', *PUBLISH_PATHS).splitlines() + \
                  git('ls-files', '--others', '--exclude-standard', '--', *PUBLISH_PATHS).splitlines()
        if not changed:
            print('✓ push: 対象ファイルに変更がないため何もしません')
            return 0

        git('fetch', '--quiet')
        behind = int(git('rev-list', '--count', 'HEAD..@{u}'))
        if behind:
            print(f'✗ push 中止: {upstream} に未取り込みのコミットが {behind} 件あります。'
                  f'git pull してから再実行してください', file=sys.stderr)
            return 4

        git('add', '--all', '--', *changed)
        name_status = git('diff', '--cached', '--name-status', '--no-renames', '--', *changed)
        # パスを指定した commit なので、ほかに stage 済みの変更があっても含めない
        git('commit', '--quiet', '-m', commit_message(name_status), '--', *changed)
        sha = git('rev-parse', '--short', 'HEAD')
        print(f'✓ commit: {sha} ({branch})')
        for line in name_status.splitlines():
            print(f'    {line}')
        remote, _, remote_branch = upstream.partition('/')
        git('push', '--quiet', remote, f'HEAD:{remote_branch}')
        print(f'✓ push: {upstream}')
        return 0
    except subprocess.CalledProcessError as e:
        print(f"✗ git {' '.join(e.cmd[1:])} に失敗: {(e.stderr or e.stdout).strip()}", file=sys.stderr)
        return 4


def write_json(path: Path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write('\n')


def main():
    ap = argparse.ArgumentParser(description='生徒マスタ CSV から JSON を生成する')
    ap.add_argument('--push', action='store_true',
                    help='エラー・画像の警告がなければ、画像とマスタだけを commit して upstream へ push する')
    args = ap.parse_args()

    try:
        rows = read_csv(CSV_PATH)
    except Exception as e:
        print(f'✗ CSV 読込失敗: {e}', file=sys.stderr)
        return 1

    print(f'✓ 読込: {CSV_PATH.relative_to(ROOT)} ({len(rows)}行)')

    records, errors = validate_and_convert(rows)

    if errors:
        for err in errors:
            print(f'✗ {err}', file=sys.stderr)
        print(f'\nビルド失敗 ({len(errors)}件のエラー)', file=sys.stderr)
        return 2

    write_json(JSON_PATH, records)
    with_img    = sum(1 for r in records if r.get('imageUrl'))
    without_img = len(records) - with_img
    print(f'✓ 検査: OK')
    warnings = check_images(records)
    for warn in warnings:
        print(f'⚠ 画像: {warn}', file=sys.stderr)
    print(f'✓ 出力: {JSON_PATH.relative_to(ROOT)} ({len(records)}件 / 画像あり {with_img} / 画像なし {without_img})')

    if not args.push:
        return 0
    if warnings:
        print(f'✗ push 中止: 画像の警告が {len(warnings)} 件あります。直してから再実行してください', file=sys.stderr)
        return 3
    return publish()


if __name__ == '__main__':
    sys.exit(main())
