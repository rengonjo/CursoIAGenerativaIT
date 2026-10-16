<script lang="ts">
  let { name }: { name: string } = $props()
  const paths: Record<string, string> = {
    agora: 'M5 5.5h14v11H9l-4 3z M9 10l2.3 2.3L15.5 8', plus: 'M12 5v14M5 12h14',
    chat: 'M5 4h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-6 3V6a2 2 0 0 1 2-2z M8 9h8M8 13h5',
    doc: 'M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z M14 3v6h6M8 13h8M8 17h5',
    library: 'M4 4v16h4V4z M11 4v16h4V4z M18 5l3 14M18 20h4',
    shield: 'M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6z M8.5 12l2.5 2.5 4.5-5',
    flask: 'M9 3h6M10 3v6L4 19a1 1 0 0 0 1 2h14a1 1 0 0 0 1-2L14 9V3M7 15h10',
    chevron: 'm9 5 7 7-7 7', arrow: 'M5 12h14m-6-6 6 6-6 6', back: 'M19 12H5m6-6-6 6 6 6', up: 'M12 19V5m-6 6 6-6 6 6', check: 'm5 12 4 4L19 6',
    search: 'M17 10.5a6.5 6.5 0 1 0-13 0 6.5 6.5 0 0 0 13 0z M16 16l5 5',
    link: 'm9 15 6-6 M9 7l2-2a4 4 0 0 1 6 6l-2 2 M15 17l-2 2a4 4 0 0 1-6-6l2-2', copy: 'M8 8h12v13H8z M16 8V3H3v13h5',
    spark: 'm12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z M20 2v4M18 4h4',
    info: 'M21 12a9 9 0 1 0-18 0 9 9 0 0 0 18 0z M12 11v6M12 7v.1', download: 'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5',
    fragments: 'M4 3h16v7H4z M4 14h16v7H4z M8 6.5h8M8 17.5h8', clock: 'M21 12a9 9 0 1 0-18 0 9 9 0 0 0 18 0z M12 7v5l3 2',
    calendar: 'M4 5h16v16H4z M4 10h16M8 3v4M16 3v4M8 14h3M8 17h7', building: 'm3 8 9-5 9 5H3 M5 10v9M10 10v9M14 10v9M19 10v9M3 21h18',
    refresh: 'M20 8a8 8 0 0 0-14-3L3 8M3 3v5h5 M4 16a8 8 0 0 0 14 3l3-3M21 21v-5h-5',
  }
</script>
<svg class="icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d={paths[name] ?? paths.doc} /></svg>
