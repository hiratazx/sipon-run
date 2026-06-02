<template>
  <div class="min-h-screen bg-slate-950 text-slate-100 relative selection:bg-purple-600 selection:text-white font-sans crt-overlay">
    <!-- Sound Mute Toggle Widget -->
    <SoundToggle />
    
    <!-- Nuxt Page Router Container -->
    <div class="relative z-20 min-h-screen flex flex-col justify-between">
      <NuxtPage />
      
      <!-- Footer Copyright -->
      <footer class="w-full text-center py-4 bg-slate-950/80 border-t border-slate-900/60 text-slate-500 text-xs backdrop-blur-sm z-30 select-none">
        <p class="tracking-wide">
          © 2026 <span class="text-purple-400 font-semibold font-retro text-[10px]">RUNFINITY</span> — Running With Infinity. Built for Stand Kampus.
        </p>
      </footer>
    </div>
  </div>
</template>

<style>
/* Page transition styles */
.page-enter-active,
.page-leave-active {
  transition: all 0.25s ease-out;
}
.page-enter-from {
  opacity: 0;
  transform: translateY(10px);
}
.page-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
