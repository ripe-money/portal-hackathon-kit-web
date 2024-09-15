'use client';

import React from 'react';
import { Box, Fab } from '@mui/material';
import { useRouter } from 'next/navigation';
import { CropFree } from '@mui/icons-material';

export default function BottomNavBar() {
  const router = useRouter();
  return (
    <Box sx={{ position: 'fixed', bottom: 0, left: 0, right: 0 }}>
      <Box
        sx={{
          position: 'relative',
          bgcolor: '#3e71f8',
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
            boxShadow: '0 -35px 0 0 #3e71f8',
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
            bgcolor: 'white',
            '&:hover': {
              bgcolor: '#e6b837',
            },
            zIndex: 1,
          }}
          onClick={() => {
            router.push('/scan');
          }}
        >
          {/* <AddIcon /> */}
          {/* <SolanaPayIcon /> */}
          <CropFree color="primary" fontSize="large" />
        </Fab>
        {/* Bottom Navigation Icons */}
        <Box sx={{ width: '70px' }} /> {/* Spacer for FAB */}
      </Box>
    </Box>
  );
}
