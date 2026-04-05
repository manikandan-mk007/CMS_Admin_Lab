export const extractError = (error) => {
  // 1. Network error
  if (!error?.response) {
    return error?.message || "Network error. Please check your connection.";
  }

  const data = error.response.data;

  // 2. Plain string
  if (typeof data === "string") return data;

  // 3. DRF standard
  if (data?.detail) return data.detail;

  // 4. Non-field errors
  if (Array.isArray(data?.non_field_errors) && data.non_field_errors.length) {
    return data.non_field_errors[0];
  }

  // 5. Generic keys
  if (typeof data?.message === "string") return data.message;
  if (typeof data?.error === "string") return data.error;

  // 6. Field errors (clean extraction)
  const messages = [];

  const extract = (obj) => {
    Object.entries(obj || {}).forEach(([key, value]) => {
      if (key === "non_field_errors") return;

      if (Array.isArray(value)) {
        value.forEach((msg) => {
          if (typeof msg === "string") {
            messages.push(msg);
          }
        });
      } else if (typeof value === "object" && value !== null) {
        extract(value);
      }
    });
  };

  extract(data);

  if (messages.length > 0) {
    // ✅ remove duplicates + clean join
    return [...new Set(messages)].join("\n");
  }

  // 7. Fallback
  return "Something went wrong. Please try again.";
};