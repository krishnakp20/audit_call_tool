export const departmentStorage = {

  set(value: string) {
    localStorage.setItem(
      "department",
      value
    );
  },

  get() {
    return localStorage.getItem(
      "department"
    );
  },

  clear() {
    localStorage.removeItem(
      "department"
    );
  }

};