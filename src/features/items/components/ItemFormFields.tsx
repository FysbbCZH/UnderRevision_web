import { BOARD_CATEGORIES, type BoardCategory, type ItemDirectoryTreeNode } from "../api/types";
import { buildLocationOptions } from "../model/item-tree";
import { normalizeCategories } from "../model/validate-item-input";
import styles from "./ItemModal.module.css";

export function LocationField({
  directories,
  value,
  disabled,
  onChange,
}: {
  directories: ItemDirectoryTreeNode[];
  value: string | null;
  disabled: boolean;
  onChange: (value: string | null) => void;
}) {
  return (
    <label className={styles.field}>
      目标位置
      <select
        value={value ?? ""}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value || null)}
      >
        {buildLocationOptions(directories).map((option) => (
          <option key={option.id ?? "root"} value={option.id ?? ""}>
            {"— ".repeat(option.depth)}{option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/** 可键盘操作的类别多选，并在交互层维持 ALL 互斥。 */
export function CategoryFields({
  value,
  disabled,
  onChange,
}: {
  value: BoardCategory[];
  disabled: boolean;
  onChange: (value: BoardCategory[]) => void;
}) {
  const toggle = (category: BoardCategory, checked: boolean) => {
    if (category === "ALL") {
      onChange(checked ? ["ALL"] : []);
      return;
    }
    const withoutAll = value.filter((item) => item !== "ALL" && item !== category);
    onChange(normalizeCategories(checked ? [...withoutAll, category] : withoutAll));
  };
  return (
    <fieldset className={styles.categories} disabled={disabled}>
      <legend>类别</legend>
      {BOARD_CATEGORIES.map((category) => (
        <label className={styles.category} key={category}>
          <input
            type="checkbox"
            checked={value.includes(category)}
            onChange={(event) => toggle(category, event.target.checked)}
          />
          {category}
        </label>
      ))}
    </fieldset>
  );
}
