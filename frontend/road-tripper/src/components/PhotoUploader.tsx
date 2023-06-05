import React, { useState } from "react";
import {
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Typography,
  Button,
} from "@mui/material";
import { useMutation } from "../core/api";
import plusSign from "../assets/plusSign.png";

export function PhotoUploader(props: {
  id: string;
  setImageString: (event: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const uploadFile = useMutation("UploadFile");
  const [file, setFile] = useState<{
    selectedFile: File | null;
    loaded: Number;
    message: string;
    defaultMessage: string;
    uploading: boolean;
  }>({
    selectedFile: null,
    loaded: 0,
    message: "Choose a photo...",
    defaultMessage: "Choose a photo...",
    uploading: false,
  });

  const handleFileChange = (files: FileList) => {
    setFile({
      ...file,
      selectedFile: files[0],
      loaded: 0,
      message: files[0] ? files[0].name : file.defaultMessage,
    });
  };

  const handleUpload = async () => {
    if (file.uploading) return;
    if (!file.selectedFile) {
      setFile({ ...file, message: "Select a file first" });
      return;
    }
    setFile({ ...file, uploading: true });
    // define upload
    const res = await uploadFile.commit({
      file: file.selectedFile,
      title: props.id,
      onUploadProgress: (ProgressEvent) => {
        setFile({
          ...file,
          loaded: Math.round(
            (ProgressEvent.loaded / ProgressEvent.total) * 100
          ),
        });
      },
    });

    setFile({
      ...file,
      message: "Uploaded successfully",
      uploading: false,
    });
    props.setImageString({
      target: { name: "image", value: res.uploadUrl },
    } as React.ChangeEvent<HTMLInputElement>);
    console.log(res.uploadUrl);
  };

  return (
    <form
      className="box"
      onSubmit={(e) => {
        e.preventDefault();
        handleUpload();
      }}
    >
      <input
        type="file"
        name="file-5[]"
        id="file-5"
        className="inputfile inputfile-4"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => {
          handleFileChange(e.target.files!);
        }}
      />
      <Card sx={{ maxWidth: 345 }}>
        <CardMedia
          sx={{ height: 140 }}
          image={
            file.selectedFile
              ? URL.createObjectURL(file.selectedFile)
              : plusSign
          }
          title="Picture"
        />
        <CardContent>
          <Typography gutterBottom variant="body2">
            {file.uploading ? file.loaded + "%" : file.message}
          </Typography>
        </CardContent>
        <CardActions>
          <label htmlFor="file-5">
            <Button size="small" component="span" variant="outlined">
              Select Image
            </Button>
          </label>
          <Button
            size="small"
            // className="submit"
            variant="contained"
            onClick={handleUpload}
            sx={{ ml: 2 }}
          >
            Upload
          </Button>
        </CardActions>
      </Card>
    </form>
  );
}
