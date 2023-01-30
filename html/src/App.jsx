import { useState } from "react";
import { useRef } from "react";

const App = () => {
  const [method, setMethod] = useState("file");
  const methodInput = useRef();
  const file = useRef();
  const link = useRef();

  const uploadFile = () => {
    const formData = new FormData();

    formData.append("extraData", "some data");

    if (method === "file") {
      formData.append(
        "bookCover",
        file.current.files[0],
        file.current.files[0].name
      );
    } else if (method === "link") {
      formData.append("bookCoverUrl", link.current.value);
    }

    fetch("http://localhost:5000/", {
      method: "POST",
      body: formData,
    });
  };

  return (
    <div>
      <select
        name="method"
        id="method"
        ref={methodInput}
        onChange={() =>
          console.log(methodInput.current.value) ||
          setMethod(methodInput.current.value)
        }
      >
        <option value="file">File</option>
        <option value="link">Link</option>
      </select>

      {method === "file" ? (
        <input type="file" name="file" id="file" accept="image/*" ref={file} />
      ) : (
        <input
          type="link"
          name="link"
          id="link"
          ref={link}
          style={{ width: "50%" }}
        />
      )}

      <button onClick={() => uploadFile()}>Push</button>
    </div>
  );
};

export default App;
