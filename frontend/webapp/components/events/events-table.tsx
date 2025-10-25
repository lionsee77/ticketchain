"use client"

import * as React from "react"
import type { Event } from "@/lib/api/events"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface EventsTableProps {
  events: Event[]
}

export function EventsTable({ events }: EventsTableProps) {
  return (
    <Table>
      <TableCaption>A list of all available events.</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Venue</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Price (ETH)</TableHead>
          <TableHead>Available</TableHead>
          <TableHead>Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {events.map((event) => (
          <TableRow key={event.id}>
            <TableCell className="font-medium">{event.name}</TableCell>
            <TableCell>{event.venue}</TableCell>
            <TableCell>
              {new Date(event.datetime).toLocaleDateString("en-US", {
                dateStyle: "medium",
              })}
            </TableCell>
            <TableCell>{event.ticket_price}</TableCell>
            <TableCell>{event.available_tickets}</TableCell>
            <TableCell>
              <Link href={`/events/${event.id}`}>
                <Button variant="outline" size="sm">
                  View Details
                </Button>
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}