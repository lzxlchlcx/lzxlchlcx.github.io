"""Sync canonical character assets to the GitHub Pages deployment directory."""

import argparse
from pathlib import Path
import shutil


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='Check copies without changing files')
    args = parser.parse_args()
    source_dir = Path(__file__).resolve().parent
    repository_dir = source_dir.parents[2]
    deployment_dir = repository_dir / 'docs' / 'assets'
    files = ('guardian.png', 'guardian-gloved.png', 'guardian-gloved.webp')

    if not (repository_dir / 'docs' / 'index.html').is_file():
        raise SystemExit('未找到本仓库的 docs/index.html；请在原仓库目录布局中使用同步脚本。')
    missing = [name for name in files if not (source_dir / name).is_file()]
    if missing:
        raise SystemExit('缺少源素材：' + ', '.join(missing))

    mismatches = [name for name in files if not (deployment_dir / name).is_file()
                  or (source_dir / name).read_bytes() != (deployment_dir / name).read_bytes()]
    if args.check:
        if mismatches:
            raise SystemExit('需要同步的人物素材：' + ', '.join(mismatches))
        print('人物源素材与主页部署副本一致。')
        return

    deployment_dir.mkdir(parents=True, exist_ok=True)
    for name in mismatches:
        shutil.copyfile(source_dir / name, deployment_dir / name)
    print(f'人物素材已同步，更新 {len(mismatches)} 个文件。')


if __name__ == '__main__':
    main()
