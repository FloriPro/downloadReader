import time
import os
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
import traceback


class MyHandler(FileSystemEventHandler):
    def __init__(self) -> None:
        self.fileEditTimestamps = {}

    def on_modified(self, event):
        #print(f"event type: {event.event_type} path : {event.src_path}")
        self.updateVersion(event.src_path)

    def on_created(self, event):
        #print(f"event type: {event.event_type} path : {event.src_path}")
        self.updateVersion(event.src_path)

    def on_deleted(self, event):
        #print(f"event type: {event.event_type} path : {event.src_path}")
        self.updateVersion(event.src_path)

    def updateVersion(self, path):
        if path not in self.fileEditTimestamps:
            self.fileEditTimestamps[path] = 0
        if time.time() - self.fileEditTimestamps[path] > 1:
            self.fileEditTimestamps[path] = time.time()

            if not os.path.exists(path=path):
                return
            if not os.path.isfile(path):
                return
            with open(path, "r") as f:
                lines = f.readlines()
            time.sleep(0.25)
            with open(path, "w") as f:
                for line in lines:
                    try:
                        if "__version__" in line:
                            if "//ok" in line or "#ok" in line:
                                currentVersion = line.split('"')[1]
                                currentVersion = currentVersion.split(".")
                                currentVersion[-1] = str(int(currentVersion[-1]) + 1)
                                currentVersion = ".".join(currentVersion)

                                SpaceBefore = line.split("_" + "_version__")[0]

                                afterStuff = ""
                                if "//ok" in line:
                                    afterStuff = "//ok"
                                if "#ok" in line:
                                    afterStuff = "#ok"

                                line = (
                                    SpaceBefore
                                    + f'__version__ = "{currentVersion}" {afterStuff}\n'
                                )
                                print("Updating version")
                    except:
                        traceback.print_exc()
                        print(line)
                    f.write(line)


event_handler = MyHandler()
observer = Observer()
observer.schedule(event_handler, path="./", recursive=True)
observer.start()


try:
    while True:
        time.sleep(1)
except KeyboardInterrupt:
    observer.stop()
    observer.join()

__version__ = "0.0.0.49" #ok












