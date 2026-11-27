import { ListPage, listMetadata, type LocaleProps } from '@/components/catalog/pages';

export function generateMetadata(props: LocaleProps) {
  return listMetadata('experiencias', props);
}

export default function Page(props: LocaleProps) {
  return <ListPage category="experiencias" params={props.params} />;
}
