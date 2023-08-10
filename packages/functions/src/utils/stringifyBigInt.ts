const stringifyBigInt = (obj: any) => {
  return JSON.stringify(obj, (key, value) =>
    typeof value === "bigint" ? value.toString() : value
  );
};

export default stringifyBigInt;
