"""Sync canonical brand artwork to the GitHub Pages deployment directory."""

import argparse
from pathlib import Path
import shutil


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='Check copies without changing files')
    args = parser.parse_args()
    design_dir = Path(__file__).resolve().parent
    deployment_dir = design_dir.parent / 'docs' / 'assets' / 'brand'
    files = {
        '莲子心-logo.svg': 'lianzixin-logo.svg',
        '莲子心-favicon.svg': 'lianzixin-favicon.svg',
    }
    if not args.check:
        deployment_dir.mkdir(parents=True, exist_ok=True)
    for original_name, deployed_name in files.items():
        original = design_dir / '品牌' / original_name
        deployed = deployment_dir / deployed_name
        if args.check:
            if not deployed.exists() or original.read_bytes() != deployed.read_bytes():
                raise SystemExit(f'Brand asset needs syncing: {deployed_name}')
        else:
            shutil.copyfile(original, deployed)
    print('Brand assets are in sync.' if args.check else 'Brand assets synced.')


if __name__ == '__main__':
    main()
