import React, { useState } from 'react';
import _ from 'lodash';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faBars } from '@fortawesome/free-solid-svg-icons';
import { emitCustomEvent, useCustomEventListener } from 'react-custom-events'
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    IconButton,
    TextField
} from "@mui/material";
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import Fab from '@mui/material/Fab';

const SnapshotSidebar = (props: any) => {

    const [showCreateDialog, setCreateDialogOpen] = React.useState(false);
    const [showDeleteDialog, setDeleteDialogOpen] = React.useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const handleTrigger = () => setIsSidebarOpen(!isSidebarOpen)
    const [snapShots, setSnapshotList] = useState([]);
    const [snapshotName, setSnapshotNameTextInput] = useState('');

    useCustomEventListener('SNAPSHOT_CREATED', (snapshotData) => {
       const newList = snapShots.concat(snapshotData);
        setSnapshotList(newList);
    })

    function openCreateSnapshotModel(): void {
        setSnapshotNameTextInput("");
        setCreateDialogOpen(true);
    }

    function openDeleteSnapshotModel(): void {
        setDeleteDialogOpen(true);
    }

    function removeSnapshot(snapshotData): void{
        var index = snapShots.findIndex(x => x.creationDate.getTime() === snapshotData.creationDate.getTime() && x.name === snapshotData.name);
        snapShots.splice(index, 1);
        setSnapshotList(snapShots);
        setDeleteDialogOpen(false);
    }

    const handleSnapshotNameInputChange = event => {
        setSnapshotNameTextInput(event.target.value);
    };

    const closeCreateSnapshotModel = () => {
        setCreateDialogOpen(false);

        let createData = {
          snapshotName: snapshotName
        };

        emitCustomEvent('CREATE_SNAPSHOT', createData);
    };

    const cancelCreate = () => {
        setCreateDialogOpen(false);
    };

    const cancelDelete = () => {
        setDeleteDialogOpen(false);
    };

    return (<div className={`sidebar${isSidebarOpen ? ' sidebar-open' : ''}`}>
        <div className="trigger" onClick={handleTrigger}>
            <FontAwesomeIcon icon={isSidebarOpen ? faTimes : faBars} />
        </div>
        <div className='snapshot-controls'>

            {isSidebarOpen ? <div className="controls">
                <Fab  aria-label="add" onClick={openCreateSnapshotModel}>
                    <AddIcon />
                </Fab>
                <span >Create Snapshot</span>
            </div> : null}

            <Dialog open={showCreateDialog} onClose={closeCreateSnapshotModel}>
                <DialogTitle>Create Snapshot</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Please specify a name for the snapshot
                    </DialogContentText>
                    <TextField
                        required
                        onChange= {handleSnapshotNameInputChange}
                        autoFocus
                        margin="dense"
                        id="name"
                        label="Name"
                        fullWidth
                        variant="standard"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={cancelCreate}>Cancel</Button>
                    <Button onClick={closeCreateSnapshotModel}>Create</Button>
                </DialogActions>
            </Dialog>

        </div>
        <div className='sidebar-container'>
            {snapShots.map((snapshot) => (
                <div key={snapshot.creationDate.getTime()} className="sidebar-position">
                    <div className="snapshot-info">
                        <span>{snapshot.name}</span>
                        <IconButton aria-label="delete" onClick={() => openDeleteSnapshotModel()}>
                            <DeleteIcon />
                        </IconButton>

                        <Dialog
                            open={showDeleteDialog}
                            onClose={cancelDelete}
                            aria-labelledby="alert-dialog-title"
                            aria-describedby="alert-dialog-description"
                        >
                            <DialogTitle id="alert-dialog-title">
                                {"Delete Snapshot " + snapshot.name + "?"}
                            </DialogTitle>
                            <DialogContent>
                                <DialogContentText id="alert-dialog-description">
                                    Are you sure you want to delete the snapshot {snapshot.name}?
                                </DialogContentText>
                            </DialogContent>
                            <DialogActions>
                                <Button onClick={cancelDelete}>Cancel</Button>
                                <Button onClick={() => removeSnapshot(snapshot)} autoFocus>
                                    Delete
                                </Button>
                            </DialogActions>
                        </Dialog>


                    </div>
                    <div className="image-contaner">
                        <img src={snapshot.imageUrl} />
                    </div>
                </div>
            ))}
        </div>
    </div>);
};

export default SnapshotSidebar;