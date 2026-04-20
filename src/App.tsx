import { InputGroupDemo } from "./components/SearchBar";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";

function App() {

  async function getFiles() {
    const files = await invoke("get_files", { path: "C:\\Users\\kenay\\OneDrive\\Desktop" });
    console.log(files);
  }


  return (
    <main className="container">
      <div>
        <button onClick={getFiles}>Get Files</button>
      </div>
      <InputGroupDemo />
    </main>
  );
}

export default App;
