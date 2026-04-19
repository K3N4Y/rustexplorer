import { invoke } from "@tauri-apps/api/core";
import "./App.css";

function App() {
  
  async function getFile() {
    const files = await invoke("get_file", { search: ".exe" });
    console.log(files);
  }

  async function getFiles() {
    const files = await invoke("get_files", { path: "C:\\Users\\kenay\\OneDrive\\Desktop" });
    console.log(files);
  }


  return (
    <main className="container">
      <div>
        <button onClick={getFile}>Get File</button>
        <button onClick={getFiles}>Get Files</button>
      </div>
    </main>
  );
}

export default App;
