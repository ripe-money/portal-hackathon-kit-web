'use client';

import React from 'react';
import { Box, Fab } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useRouter } from 'next/navigation';

export default function BottomNavBar() {
  const router = useRouter();
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
          onClick={() => {
            router.push('/scan');
          }}
        >
          <AddIcon />
        </Fab>
        {/* Bottom Navigation Icons */}
        <Box sx={{ width: '70px' }} /> {/* Spacer for FAB */}
      </Box>
    </Box>
  );
}
