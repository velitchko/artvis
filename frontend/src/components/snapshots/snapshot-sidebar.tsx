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
    MenuItem,
    Select,
    TextField
} from "@mui/material";
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import Fab from '@mui/material/Fab';

const SnapshotSidebar = (props: any) => {

    const [showCreateDialog, setCreateDialogOpen] = React.useState(false);
    const [showDeleteDialog, setDeleteDialogOpen] = React.useState(false);
    const [showSnapShotPositionDialog, setSnapShotPositionDialogOpen] = React.useState(false);

    const [snapshotToDelete, setSnapshotToDelete] = React.useState<any>();
    const [snapshotToLoad, setSnapshotToLoad] = React.useState<any>();
    const [snapshotPosition, setSnapshotPosition] = React.useState(1);

    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const handleTrigger = () => setIsSidebarOpen(!isSidebarOpen)
    const [snapShots, setSnapshotList] = useState([]);
    const [snapshotName, setSnapshotNameTextInput] = useState('');

    useCustomEventListener('SNAPSHOT_CREATED', (snapshotData) => {
        const newList = snapShots.concat(snapshotData);
        setSnapshotList(newList);
    })

    function loadSnapshot() {
        setSnapShotPositionDialogOpen(false);
        var snapshotData = {
            snapshot: snapshotToLoad,
            position: snapshotPosition
        }

        emitCustomEvent('LOAD_SNAPSHOT', snapshotData);
    }

    function showLoadSnapshot(snapshot) {
        setSnapshotToLoad(snapshot);
        setSnapShotPositionDialogOpen(true);
    }

    function openCreateSnapshotModel(): void {
        setSnapshotNameTextInput("");
        setCreateDialogOpen(true);
    }

    function openDeleteSnapshotModel(snapshot): void {
        setSnapshotToDelete(snapshot);
        setDeleteDialogOpen(true);
    }

    function removeSnapshot(): void {
        var index = snapShots.findIndex(x => x.creationDate.getTime() === snapshotToDelete.creationDate.getTime() && x.name === snapshotToDelete.name);
        snapShots.splice(index, 1);
        setSnapshotList(snapShots);
        setDeleteDialogOpen(false);
    }

    function handlePositionChange(e) {
        setSnapshotPosition(e.target.value);
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

    const cancelSelect = () => {
        setSnapshotPosition(1);
        setSnapShotPositionDialogOpen(false);
    };

    const cancelDelete = () => {
        setSnapshotToDelete({});
        setDeleteDialogOpen(false);
    };

    return (<div className={`sidebar${isSidebarOpen ? ' sidebar-open' : ''}`}>
        <div className="trigger" onClick={handleTrigger}>
            <FontAwesomeIcon icon={isSidebarOpen ? faTimes : faBars} />
        </div>
        <div className='snapshot-controls'>

            {isSidebarOpen ? <div className="controls">
                <Fab aria-label="add" onClick={openCreateSnapshotModel}>
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
                        onChange={handleSnapshotNameInputChange}
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

            <Dialog open={showSnapShotPositionDialog}>
                <DialogTitle>Create Snapshot</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Please specify the slot in which you want to load the snapshot
                    </DialogContentText>
                    <Select
                        labelId="demo-simple-select-label"
                        id="demo-simple-select"
                        value={snapshotPosition}
                        label="Position"
                        onChange={handlePositionChange}
                    >
                        <MenuItem value={1}>1</MenuItem>
                        <MenuItem value={2}>2</MenuItem>
                    </Select>
                </DialogContent>
                <DialogActions>
                    <Button onClick={cancelSelect}>Cancel</Button>
                    <Button onClick={loadSnapshot}>Load</Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={showDeleteDialog}
                onClose={cancelDelete}
                aria-labelledby="alert-dialog-title"
                aria-describedby="alert-dialog-description"
            >
                <DialogTitle id="alert-dialog-title">
                    {"Delete Snapshot?"}
                </DialogTitle>
                <DialogContent>
                    <DialogContentText id="alert-dialog-description">
                        Are you sure you want to delete this snapshot?
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={cancelDelete}>Cancel</Button>
                    <Button onClick={() => removeSnapshot()} autoFocus>
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>

        </div>
        <div className='sidebar-container'>
            {snapShots.map((snapshot) => (
                <div key={snapshot.creationDate.getTime()} className="sidebar-position">
                    <div className="snapshot-info">
                        <span>{snapshot.name}</span>
                        <IconButton aria-label="delete" onClick={() => openDeleteSnapshotModel(snapshot)}>
                            <DeleteIcon />
                        </IconButton>
                    </div>
                    <div key={snapshot.creationDate.getTime()} className="image-contaner" onClick={() => showLoadSnapshot(snapshot)}>
                        <img src={snapshot.imageUrl} />
                    </div>
                </div>
            ))}
        </div>
    </div>);
};

export default SnapshotSidebar;