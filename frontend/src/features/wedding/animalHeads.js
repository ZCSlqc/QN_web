export const animalHeads = [
  ["white-bird", "小白鸟", "#fffaf0"],
  ["pig", "小猪", "#f4cba4"],
  ["chick", "小鸡", "#ffe485"],
  ["chicken", "公鸡", "#fffaf0"],
  ["tabby-cat", "狸花猫", "#c3a875"],
  ["rabbit", "兔子", "#fff1ce"],
  ["bear", "小熊", "#c8a45e"],
  ["white-cat", "白猫", "#fff1ce"],
  ["monkey", "猴子", "#b99759"],
  ["tiger", "老虎", "#efbf58"],
  ["fox", "狐狸", "#e8a43b"],
  ["frog", "青蛙", "#afdfb1"],
].map(([id, label, backColor]) => ({
  id: `animal-${id}`, name: label, label, backColor, slot: "animalHead",
  file: `animal-${id}-front.webp`,
  backFile: `animal-${id}-back.webp`,
}));
