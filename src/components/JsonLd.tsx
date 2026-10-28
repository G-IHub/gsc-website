import { useEffect } from "react";

// Adds a <script type="application/ld+json"> block to the page head while this component is mounted.
// Search engines that render JavaScript (Google does) read it like any other structured data.
const JsonLd = ({ id, data }: { id: string; data: object }) => {
  const json = JSON.stringify(data);
  useEffect(() => {
    const el = document.createElement("script");
    el.type = "application/ld+json";
    el.id = id;
    el.text = json;
    document.head.appendChild(el);
    return () => el.remove();
  }, [id, json]);
  return null;
};

export default JsonLd;
