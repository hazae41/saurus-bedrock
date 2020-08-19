export const Normal: Deno.OpenOptions = {
  read: true,
  write: true,
  create: true,
  append: false,
};

export const Append: Deno.OpenOptions = {
  read: true,
  write: true,
  create: true,
  append: true,
};
