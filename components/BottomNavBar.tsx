import React from 'react';
import { Box, Fab, IconButton } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import AddIcon from '@mui/icons-material/Add';

export default function BottomNavBar() {
  return (
    <Box sx={{ position: 'fixed', bottom: 0, left: 0, right: 0 }}>
      <Box
        sx={{
          position: 'relative',
          bgcolor: '#3f51b5',
          height: '56px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          px: 2,
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '70px',
            height: '70px',
            backgroundColor: 'transparent',
            borderRadius: '35px',
            boxShadow: '0 -35px 0 0 #3f51b5',
          },
        }}
      >
        {/* Floating Action Button */}
        <Fab
          color="secondary"
          aria-label="add"
          sx={{
            position: 'absolute',
            top: '-28px',
            left: '50%',
            transform: 'translateX(-50%)',
            bgcolor: '#ff4081',
            '&:hover': {
              bgcolor: '#f50057',
            },
            zIndex: 1,
          }}
        >
          <AddIcon />
        </Fab>
        {/* Bottom Navigation Icons */}
        <IconButton sx={{ color: 'white' }}>
          <HomeIcon />
        </IconButton>
        <IconButton sx={{ color: 'white' }}>
          <FileDownloadIcon />
        </IconButton>
        <Box sx={{ width: '70px' }} /> {/* Spacer for FAB */}
        <IconButton sx={{ color: 'white' }}>
          <MoreVertIcon />
        </IconButton>
      </Box>
    </Box>
  );
}
