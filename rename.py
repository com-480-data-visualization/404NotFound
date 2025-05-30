import os
import re

def sanitize_filename(name: str) -> str:
    """
    Lowercase the name and strip out any character
    that is NOT a lowercase letter, digit, or dot.
    """
    name = name.lower()
    # keep only a–z, 0–9, and dot
    return re.sub(r'[^a-z0-9\.]', '', name)


def rename_files_in_directory(dir_path: str):
    """
    Rename every file in dir_path according to sanitize_filename().
    If a sanitized filename already exists, append _1, _2, ... before the extension.
    """
    for original in os.listdir(dir_path):
        old_path = os.path.join(dir_path, original)
        if not os.path.isfile(old_path):
            continue

        # sanitize
        new_name = sanitize_filename(original)
        # split off the last extension
        name_part, ext = os.path.splitext(new_name)

        # collision‐safe candidate
        candidate = new_name
        counter = 1
        while os.path.exists(os.path.join(dir_path, candidate)):
            candidate = f"{name_part}_{counter}{ext}"
            counter += 1

        if candidate != original:
            new_path = os.path.join(dir_path, candidate)
            print(f"Renaming:\n  {old_path}\n→ {new_path}")
            os.rename(old_path, new_path)


if __name__ == "__main__":
    base = os.path.join("data", "images")
    for year in range(1960, 2026):
        folder = os.path.join(base, str(year))
        if os.path.isdir(folder):
            print(f"\nProcessing directory: {folder}")
            rename_files_in_directory(folder)
        else:
            print(f"\nSkipping missing directory: {folder}")
