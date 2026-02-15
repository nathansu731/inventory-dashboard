export const appsyncRequest = async (
  idToken: string,
  query: string,
  variables?: Record<string, unknown>
) => {
  const apiUrl = process.env.APPSYNC_API_URL;
  if (!apiUrl) {
    throw new Error("Missing APPSYNC_API_URL");
  }

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: idToken,
    },
    body: JSON.stringify({ query, variables }),
  });

  const json = await response.json();
  const errorMessage = json?.errors?.[0]?.message;
  if (!response.ok) {
    throw new Error(errorMessage || "AppSync error");
  }
  if (errorMessage) {
    throw new Error(errorMessage);
  }

  return json;
};
