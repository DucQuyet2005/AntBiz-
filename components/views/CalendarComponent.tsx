"use client";

import React, { forwardRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

const CalendarComponent = forwardRef<FullCalendar, any>((props, ref) => {
  return (
    <FullCalendar
      ref={ref}
      plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
      {...props}
    />
  );
});

CalendarComponent.displayName = 'CalendarComponent';

export default CalendarComponent;
