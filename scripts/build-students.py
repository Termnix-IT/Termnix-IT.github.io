#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
data/students.master.csv → data/students.master.json

CSV を本番データ JSON に変換する。アプリは JSON を fetch するため、
CSV を編集したら必ず本スクリプトを実行して JSON を再生成する。

Usage:
    python scripts/build-students.py

バリデーション:
- id: 必須・英小文字+数字+ハイフンのみ・重複禁止
- name / school: 必須・空文字禁止 (school は任意の文字列を許可。新学校追加可)
- role: ROLES のいずれか
- rarity: 1 / 2 / 3
- attackType: ATTACK_TYPES のいずれか
- armorType: ARMOR_TYPES のいずれか
- position: POSITIONS のいずれか
- imageUrl: 任意 (空可)

新学校を追加した場合の影響:
- フィルタ・グルーピングは自動対応 (動的検出)
- 表示順を制御したい場合は data/constants.js の SCHOOLS 配列に追加
- 専用カラーを当てたい場合は data/constants.js の SCHOOL_COLORS に追加
"""

import csv
import json
import re
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


def write_json(path: Path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write('\n')


def main():
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
    print(f'✓ 出力: {JSON_PATH.relative_to(ROOT)} ({len(records)}件 / 画像あり {with_img} / 画像なし {without_img})')
    return 0


if __name__ == '__main__':
    sys.exit(main())
